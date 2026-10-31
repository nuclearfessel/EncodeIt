; Windows NSIS — Standard vs Custom host integrations (installer).
; Uninstall: wipe app data + plugins; ask whether to keep Videos\EncodeIt media.
; Detection = install folders / Resolve.exe on disk (apps do NOT need to be running).
; Standard: pre-checks apps found on this PC (folders only for those).
; Custom: user can choose any combination; checkboxes are always selectable.

!include "nsDialogs.nsh"
!include "LogicLib.nsh"

!macro customPageAfterChangeDir
  !ifndef BUILD_UNINSTALLER
    Page custom EncodeItIntegrationsPageCreate EncodeItIntegrationsPageLeave
  !endif
!macroend

!macro customInstall
  !ifndef BUILD_UNINSTALLER
    Call EncodeItRunHostSetup
  !endif
!macroend

; Full clean uninstall (media wipe by default; user can Keep Media via No).
!macro customUnInstall
  MessageBox MB_YESNO|MB_ICONEXCLAMATION|MB_DEFBUTTON1 \
    "Remove EncodeIt completely?$\r$\n$\r$\nYes — delete settings, plugins/scripts, AND media folders$\r$\n(Videos\EncodeIt including from-ae / Output).$\r$\n$\r$\nNo — delete settings and plugins but KEEP media folders." \
    IDYES encodeit_wipe_media
  Goto encodeit_clean_rest

  encodeit_wipe_media:
    RMDir /r "$PROFILE\Videos\EncodeIt"
    RMDir /r "$PROFILE\Videos\Encode This"

  encodeit_clean_rest:
    RMDir /r "$APPDATA\EncodeIt"
    RMDir /r "$APPDATA\Encode This"
    RMDir /r "$LOCALAPPDATA\EncodeIt"
    RMDir /r "$LOCALAPPDATA\Encode This"
    RMDir /r "$APPDATA\Adobe\CEP\extensions\encodeit-ae"
    RMDir /r "$APPDATA\Adobe\CEP\extensions\encode-this-ae"
    Delete "$APPDATA\Blackmagic Design\DaVinci Resolve\Support\Fusion\Scripts\Utility\send_to_encodeit.py"
    Delete "$APPDATA\Blackmagic Design\DaVinci Resolve\Support\Fusion\Scripts\Utility\send_to_encode_this.py"
    Delete "$APPDATA\Blackmagic Design\DaVinci Resolve\Support\Fusion\Scripts\Utility\resolve_deliver_handoff.py"
    Delete "$APPDATA\Blackmagic Design\DaVinci Resolve\Support\Fusion\Scripts\Utility\resolve_deliver_handoff_encode_this.py"
    ; Best-effort Adobe Scripts (common year folders; missing paths are ignored)
    Delete "$PROGRAMFILES\Adobe\Adobe After Effects 2024\Support Files\Scripts\SendToEncodeIt.jsx"
    Delete "$PROGRAMFILES\Adobe\Adobe After Effects 2025\Support Files\Scripts\SendToEncodeIt.jsx"
    Delete "$PROGRAMFILES\Adobe\Adobe After Effects 2026\Support Files\Scripts\SendToEncodeIt.jsx"
    Delete "$PROGRAMFILES\Adobe\Adobe After Effects 2024\Support Files\Scripts\SendToEncodeThis.jsx"
    Delete "$PROGRAMFILES\Adobe\Adobe After Effects 2025\Support Files\Scripts\SendToEncodeThis.jsx"
    Delete "$PROGRAMFILES\Adobe\Adobe After Effects 2026\Support Files\Scripts\SendToEncodeThis.jsx"
    Delete "$PROGRAMFILES\Adobe\Adobe Premiere Pro 2024\Scripts\SendToEncodeIt.jsx"
    Delete "$PROGRAMFILES\Adobe\Adobe Premiere Pro 2025\Scripts\SendToEncodeIt.jsx"
    Delete "$PROGRAMFILES\Adobe\Adobe Premiere Pro 2026\Scripts\SendToEncodeIt.jsx"
    Delete "$PROGRAMFILES\Adobe\Adobe Premiere Pro 2024\Scripts\SendToEncodeThis.jsx"
    Delete "$PROGRAMFILES\Adobe\Adobe Premiere Pro 2025\Scripts\SendToEncodeThis.jsx"
    Delete "$PROGRAMFILES\Adobe\Adobe Premiere Pro 2026\Scripts\SendToEncodeThis.jsx"
!macroend

!ifndef BUILD_UNINSTALLER
  Var EncodeItIntegrationsDialog
  Var EncodeItRadioStandard
  Var EncodeItRadioCustom
  Var EncodeItCheckAE
  Var EncodeItCheckResolve
  Var EncodeItCheckPremiere
  Var EncodeItInstallAE
  Var EncodeItInstallResolve
  Var EncodeItInstallPremiere
  Var EncodeItInstallMode
  Var EncodeItHasAE
  Var EncodeItHasResolve
  Var EncodeItHasPremiere
  Var EncodeItDetectNote

  Function EncodeItScanAdobeDir
    ; $R9 = Adobe root (e.g. $PROGRAMFILES\Adobe)
    Push $R0
    Push $R1
    Push $R2
    ClearErrors
    FindFirst $R0 $R1 "$R9\*"
    ${If} ${Errors}
      Pop $R2
      Pop $R1
      Pop $R0
      Return
    ${EndIf}
    EncodeItAdobeLoop:
      StrCmp $R1 "" EncodeItAdobeDone
      StrCmp $R1 "." EncodeItAdobeNext
      StrCmp $R1 ".." EncodeItAdobeNext
      ; Match "Adobe After Effects ..." (any year / Beta)
      StrCpy $R2 $R1 19
      StrCmp $R2 "Adobe After Effects" 0 +2
        StrCpy $EncodeItHasAE "1"
      ; Match "Adobe Premiere Pro ..."
      StrCpy $R2 $R1 18
      StrCmp $R2 "Adobe Premiere Pro" 0 +2
        StrCpy $EncodeItHasPremiere "1"
      EncodeItAdobeNext:
      ClearErrors
      FindNext $R0 $R1
      ${IfNot} ${Errors}
        Goto EncodeItAdobeLoop
      ${EndIf}
    EncodeItAdobeDone:
    FindClose $R0
    Pop $R2
    Pop $R1
    Pop $R0
  FunctionEnd

  Function EncodeItDetectHostApps
    StrCpy $EncodeItHasAE "0"
    StrCpy $EncodeItHasResolve "0"
    StrCpy $EncodeItHasPremiere "0"

    StrCpy $R9 "$PROGRAMFILES\Adobe"
    Call EncodeItScanAdobeDir
    StrCpy $R9 "$PROGRAMFILES32\Adobe"
    Call EncodeItScanAdobeDir
    StrCpy $R9 "$PROGRAMFILES64\Adobe"
    Call EncodeItScanAdobeDir

    IfFileExists "$PROGRAMFILES\Blackmagic Design\DaVinci Resolve\Resolve.exe" 0 +2
      StrCpy $EncodeItHasResolve "1"
    IfFileExists "$PROGRAMFILES64\Blackmagic Design\DaVinci Resolve\Resolve.exe" 0 +2
      StrCpy $EncodeItHasResolve "1"
    IfFileExists "$PROGRAMFILES32\Blackmagic Design\DaVinci Resolve\Resolve.exe" 0 +2
      StrCpy $EncodeItHasResolve "1"
    IfFileExists "$LOCALAPPDATA\Blackmagic Design\DaVinci Resolve" 0 +2
      StrCpy $EncodeItHasResolve "1"
  FunctionEnd

  Function EncodeItIntegrationsPageCreate
    Call EncodeItDetectHostApps

    nsDialogs::Create 1018
    Pop $EncodeItIntegrationsDialog
    ${If} $EncodeItIntegrationsDialog == error
      Abort
    ${EndIf}

    ${NSD_CreateLabel} 0 0 100% 24u "Standard sets up apps found on this PC. Custom lets you tick After Effects, Resolve, and/or Premiere yourself."
    Pop $0

    ; Detection summary so greyed Standard state is understandable
    StrCpy $EncodeItDetectNote "Detected:"
    ${If} $EncodeItHasAE == "1"
      StrCpy $EncodeItDetectNote "$EncodeItDetectNote After Effects"
    ${EndIf}
    ${If} $EncodeItHasResolve == "1"
      StrCpy $EncodeItDetectNote "$EncodeItDetectNote · Resolve"
    ${EndIf}
    ${If} $EncodeItHasPremiere == "1"
      StrCpy $EncodeItDetectNote "$EncodeItDetectNote · Premiere"
    ${EndIf}
    ${If} $EncodeItHasAE == "0"
      ${If} $EncodeItHasResolve == "0"
        ${If} $EncodeItHasPremiere == "0"
          StrCpy $EncodeItDetectNote "Detected: none (Custom can still create folders for apps you plan to use)"
        ${EndIf}
      ${EndIf}
    ${EndIf}
    ${NSD_CreateLabel} 0 26u 100% 14u "$EncodeItDetectNote"
    Pop $0

    ${NSD_CreateRadioButton} 0 46u 100% 14u "Standard install — set up every detected host app"
    Pop $EncodeItRadioStandard
    ${NSD_Check} $EncodeItRadioStandard

    ${NSD_CreateRadioButton} 0 64u 100% 14u "Custom install — choose applications"
    Pop $EncodeItRadioCustom

    ${NSD_CreateCheckbox} 18u 90u 100% 12u "After Effects"
    Pop $EncodeItCheckAE
    ${NSD_CreateCheckbox} 18u 108u 100% 12u "DaVinci Resolve"
    Pop $EncodeItCheckResolve
    ${NSD_CreateCheckbox} 18u 126u 100% 12u "Premiere Pro"
    Pop $EncodeItCheckPremiere

    ; Default checks from detection (Standard)
    ${If} $EncodeItHasAE == "1"
      ${NSD_Check} $EncodeItCheckAE
    ${Else}
      ${NSD_Uncheck} $EncodeItCheckAE
    ${EndIf}
    ${If} $EncodeItHasResolve == "1"
      ${NSD_Check} $EncodeItCheckResolve
    ${Else}
      ${NSD_Uncheck} $EncodeItCheckResolve
    ${EndIf}
    ${If} $EncodeItHasPremiere == "1"
      ${NSD_Check} $EncodeItCheckPremiere
    ${Else}
      ${NSD_Uncheck} $EncodeItCheckPremiere
    ${EndIf}

    ${NSD_OnClick} $EncodeItRadioStandard EncodeItOnInstallMode
    ${NSD_OnClick} $EncodeItRadioCustom EncodeItOnInstallMode
    Call EncodeItApplyStandardMode

    nsDialogs::Show
  FunctionEnd

  Function EncodeItApplyStandardMode
    ; Grey out checkboxes under Standard (selection is detection-driven)
    ${If} $EncodeItHasAE == "1"
      ${NSD_Check} $EncodeItCheckAE
    ${Else}
      ${NSD_Uncheck} $EncodeItCheckAE
    ${EndIf}
    ${If} $EncodeItHasResolve == "1"
      ${NSD_Check} $EncodeItCheckResolve
    ${Else}
      ${NSD_Uncheck} $EncodeItCheckResolve
    ${EndIf}
    ${If} $EncodeItHasPremiere == "1"
      ${NSD_Check} $EncodeItCheckPremiere
    ${Else}
      ${NSD_Uncheck} $EncodeItCheckPremiere
    ${EndIf}
    EnableWindow $EncodeItCheckAE 0
    EnableWindow $EncodeItCheckResolve 0
    EnableWindow $EncodeItCheckPremiere 0
  FunctionEnd

  Function EncodeItApplyCustomMode
    ; Custom: always allow choosing any host app
    EnableWindow $EncodeItCheckAE 1
    EnableWindow $EncodeItCheckResolve 1
    EnableWindow $EncodeItCheckPremiere 1
  FunctionEnd

  Function EncodeItOnInstallMode
    ; Prefer Custom radio state — avoids race when Standard still looks checked mid-click
    ${NSD_GetState} $EncodeItRadioCustom $0
    ${If} $0 == ${BST_CHECKED}
      Call EncodeItApplyCustomMode
    ${Else}
      Call EncodeItApplyStandardMode
    ${EndIf}
  FunctionEnd

  Function EncodeItIntegrationsPageLeave
    ${NSD_GetState} $EncodeItRadioCustom $0
    ${If} $0 == ${BST_CHECKED}
      StrCpy $EncodeItInstallMode "custom"
      ${NSD_GetState} $EncodeItCheckAE $1
      ${If} $1 == ${BST_CHECKED}
        StrCpy $EncodeItInstallAE "true"
      ${Else}
        StrCpy $EncodeItInstallAE "false"
      ${EndIf}
      ${NSD_GetState} $EncodeItCheckResolve $1
      ${If} $1 == ${BST_CHECKED}
        StrCpy $EncodeItInstallResolve "true"
      ${Else}
        StrCpy $EncodeItInstallResolve "false"
      ${EndIf}
      ${NSD_GetState} $EncodeItCheckPremiere $1
      ${If} $1 == ${BST_CHECKED}
        StrCpy $EncodeItInstallPremiere "true"
      ${Else}
        StrCpy $EncodeItInstallPremiere "false"
      ${EndIf}
    ${Else}
      StrCpy $EncodeItInstallMode "standard"
      ${If} $EncodeItHasAE == "1"
        StrCpy $EncodeItInstallAE "true"
      ${Else}
        StrCpy $EncodeItInstallAE "false"
      ${EndIf}
      ${If} $EncodeItHasResolve == "1"
        StrCpy $EncodeItInstallResolve "true"
      ${Else}
        StrCpy $EncodeItInstallResolve "false"
      ${EndIf}
      ${If} $EncodeItHasPremiere == "1"
        StrCpy $EncodeItInstallPremiere "true"
      ${Else}
        StrCpy $EncodeItInstallPremiere "false"
      ${EndIf}
    ${EndIf}
  FunctionEnd

  Function EncodeItRunHostSetup
    ${If} $EncodeItInstallMode == ""
      Call EncodeItDetectHostApps
      StrCpy $EncodeItInstallMode "standard"
      ${If} $EncodeItHasAE == "1"
        StrCpy $EncodeItInstallAE "true"
      ${Else}
        StrCpy $EncodeItInstallAE "false"
      ${EndIf}
      ${If} $EncodeItHasResolve == "1"
        StrCpy $EncodeItInstallResolve "true"
      ${Else}
        StrCpy $EncodeItInstallResolve "false"
      ${EndIf}
      ${If} $EncodeItHasPremiere == "1"
        StrCpy $EncodeItInstallPremiere "true"
      ${Else}
        StrCpy $EncodeItInstallPremiere "false"
      ${EndIf}
    ${EndIf}

    CreateDirectory "$PROFILE\Videos\EncodeIt"
    CreateDirectory "$PROFILE\Videos\EncodeIt\Output"
    CreateDirectory "$APPDATA\EncodeIt"

    FileOpen $0 "$PROFILE\Videos\EncodeIt\Output\README.txt" w
    FileWrite $0 "Default encode output for watched host folders.$\r$\n"
    FileClose $0

    ${If} $EncodeItInstallAE == "true"
      CreateDirectory "$PROFILE\Videos\EncodeIt\from-ae"
      FileOpen $0 "$PROFILE\Videos\EncodeIt\from-ae\README.txt" w
      FileWrite $0 "Render After Effects Output Module files into this folder. EncodeIt watches it automatically.$\r$\n"
      FileClose $0
    ${EndIf}

    ${If} $EncodeItInstallResolve == "true"
      CreateDirectory "$PROFILE\Videos\EncodeIt\from-resolve"
      FileOpen $0 "$PROFILE\Videos\EncodeIt\from-resolve\README.txt" w
      FileWrite $0 "Set DaVinci Resolve Deliver destination to this folder. EncodeIt watches it automatically.$\r$\n"
      FileClose $0
    ${EndIf}

    ${If} $EncodeItInstallPremiere == "true"
      CreateDirectory "$PROFILE\Videos\EncodeIt\from-premiere"
      FileOpen $0 "$PROFILE\Videos\EncodeIt\from-premiere\README.txt" w
      FileWrite $0 "Export from Premiere Pro into this folder. EncodeIt watches it automatically.$\r$\n"
      FileClose $0
    ${EndIf}

    FileOpen $0 "$APPDATA\EncodeIt\install-options.json" w
    FileWrite $0 '{"mode":"'
    FileWrite $0 $EncodeItInstallMode
    FileWrite $0 '","afterEffects":'
    FileWrite $0 $EncodeItInstallAE
    FileWrite $0 ',"resolve":'
    FileWrite $0 $EncodeItInstallResolve
    FileWrite $0 ',"premiere":'
    FileWrite $0 $EncodeItInstallPremiere
    FileWrite $0 '}$\r$\n'
    FileClose $0
  FunctionEnd
!endif
