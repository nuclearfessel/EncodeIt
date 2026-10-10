; Windows NSIS — Standard vs Custom host integrations (installer only).
; Detection = install folders / Resolve.exe on disk (apps do NOT need to be running).
; Standard: pre-checks apps found on this PC (folders only for those).
; Custom: user can choose any combination; checkboxes are always selectable.
; electron-builder compiles this twice (installer + uninstaller); keep uninstall path empty.

!include "nsDialogs.nsh"
!include "LogicLib.nsh"

!macro customPageAfterChangeDir
  !ifndef BUILD_UNINSTALLER
    Page custom EncodeThisIntegrationsPageCreate EncodeThisIntegrationsPageLeave
  !endif
!macroend

!macro customInstall
  !ifndef BUILD_UNINSTALLER
    Call EncodeThisRunHostSetup
  !endif
!macroend

!ifndef BUILD_UNINSTALLER
  Var EncodeThisIntegrationsDialog
  Var EncodeThisRadioStandard
  Var EncodeThisRadioCustom
  Var EncodeThisCheckAE
  Var EncodeThisCheckResolve
  Var EncodeThisCheckPremiere
  Var EncodeThisInstallAE
  Var EncodeThisInstallResolve
  Var EncodeThisInstallPremiere
  Var EncodeThisInstallMode
  Var EncodeThisHasAE
  Var EncodeThisHasResolve
  Var EncodeThisHasPremiere
  Var EncodeThisDetectNote

  Function EncodeThisScanAdobeDir
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
    EncodeThisAdobeLoop:
      StrCmp $R1 "" EncodeThisAdobeDone
      StrCmp $R1 "." EncodeThisAdobeNext
      StrCmp $R1 ".." EncodeThisAdobeNext
      ; Match "Adobe After Effects ..." (any year / Beta)
      StrCpy $R2 $R1 19
      StrCmp $R2 "Adobe After Effects" 0 +2
        StrCpy $EncodeThisHasAE "1"
      ; Match "Adobe Premiere Pro ..."
      StrCpy $R2 $R1 18
      StrCmp $R2 "Adobe Premiere Pro" 0 +2
        StrCpy $EncodeThisHasPremiere "1"
      EncodeThisAdobeNext:
      ClearErrors
      FindNext $R0 $R1
      ${IfNot} ${Errors}
        Goto EncodeThisAdobeLoop
      ${EndIf}
    EncodeThisAdobeDone:
    FindClose $R0
    Pop $R2
    Pop $R1
    Pop $R0
  FunctionEnd

  Function EncodeThisDetectHostApps
    StrCpy $EncodeThisHasAE "0"
    StrCpy $EncodeThisHasResolve "0"
    StrCpy $EncodeThisHasPremiere "0"

    StrCpy $R9 "$PROGRAMFILES\Adobe"
    Call EncodeThisScanAdobeDir
    StrCpy $R9 "$PROGRAMFILES32\Adobe"
    Call EncodeThisScanAdobeDir
    StrCpy $R9 "$PROGRAMFILES64\Adobe"
    Call EncodeThisScanAdobeDir

    IfFileExists "$PROGRAMFILES\Blackmagic Design\DaVinci Resolve\Resolve.exe" 0 +2
      StrCpy $EncodeThisHasResolve "1"
    IfFileExists "$PROGRAMFILES64\Blackmagic Design\DaVinci Resolve\Resolve.exe" 0 +2
      StrCpy $EncodeThisHasResolve "1"
    IfFileExists "$PROGRAMFILES32\Blackmagic Design\DaVinci Resolve\Resolve.exe" 0 +2
      StrCpy $EncodeThisHasResolve "1"
    IfFileExists "$LOCALAPPDATA\Blackmagic Design\DaVinci Resolve" 0 +2
      StrCpy $EncodeThisHasResolve "1"
  FunctionEnd

  Function EncodeThisIntegrationsPageCreate
    Call EncodeThisDetectHostApps

    nsDialogs::Create 1018
    Pop $EncodeThisIntegrationsDialog
    ${If} $EncodeThisIntegrationsDialog == error
      Abort
    ${EndIf}

    ${NSD_CreateLabel} 0 0 100% 24u "Standard sets up apps found on this PC. Custom lets you tick After Effects, Resolve, and/or Premiere yourself."
    Pop $0

    ; Detection summary so greyed Standard state is understandable
    StrCpy $EncodeThisDetectNote "Detected:"
    ${If} $EncodeThisHasAE == "1"
      StrCpy $EncodeThisDetectNote "$EncodeThisDetectNote After Effects"
    ${EndIf}
    ${If} $EncodeThisHasResolve == "1"
      StrCpy $EncodeThisDetectNote "$EncodeThisDetectNote · Resolve"
    ${EndIf}
    ${If} $EncodeThisHasPremiere == "1"
      StrCpy $EncodeThisDetectNote "$EncodeThisDetectNote · Premiere"
    ${EndIf}
    ${If} $EncodeThisHasAE == "0"
      ${If} $EncodeThisHasResolve == "0"
        ${If} $EncodeThisHasPremiere == "0"
          StrCpy $EncodeThisDetectNote "Detected: none (Custom can still create folders for apps you plan to use)"
        ${EndIf}
      ${EndIf}
    ${EndIf}
    ${NSD_CreateLabel} 0 26u 100% 14u "$EncodeThisDetectNote"
    Pop $0

    ${NSD_CreateRadioButton} 0 46u 100% 14u "Standard install — set up every detected host app"
    Pop $EncodeThisRadioStandard
    ${NSD_Check} $EncodeThisRadioStandard

    ${NSD_CreateRadioButton} 0 64u 100% 14u "Custom install — choose applications"
    Pop $EncodeThisRadioCustom

    ${NSD_CreateCheckbox} 18u 90u 100% 12u "After Effects"
    Pop $EncodeThisCheckAE
    ${NSD_CreateCheckbox} 18u 108u 100% 12u "DaVinci Resolve"
    Pop $EncodeThisCheckResolve
    ${NSD_CreateCheckbox} 18u 126u 100% 12u "Premiere Pro"
    Pop $EncodeThisCheckPremiere

    ; Default checks from detection (Standard)
    ${If} $EncodeThisHasAE == "1"
      ${NSD_Check} $EncodeThisCheckAE
    ${Else}
      ${NSD_Uncheck} $EncodeThisCheckAE
    ${EndIf}
    ${If} $EncodeThisHasResolve == "1"
      ${NSD_Check} $EncodeThisCheckResolve
    ${Else}
      ${NSD_Uncheck} $EncodeThisCheckResolve
    ${EndIf}
    ${If} $EncodeThisHasPremiere == "1"
      ${NSD_Check} $EncodeThisCheckPremiere
    ${Else}
      ${NSD_Uncheck} $EncodeThisCheckPremiere
    ${EndIf}

    ${NSD_OnClick} $EncodeThisRadioStandard EncodeThisOnInstallMode
    ${NSD_OnClick} $EncodeThisRadioCustom EncodeThisOnInstallMode
    Call EncodeThisApplyStandardMode

    nsDialogs::Show
  FunctionEnd

  Function EncodeThisApplyStandardMode
    ; Grey out checkboxes under Standard (selection is detection-driven)
    ${If} $EncodeThisHasAE == "1"
      ${NSD_Check} $EncodeThisCheckAE
    ${Else}
      ${NSD_Uncheck} $EncodeThisCheckAE
    ${EndIf}
    ${If} $EncodeThisHasResolve == "1"
      ${NSD_Check} $EncodeThisCheckResolve
    ${Else}
      ${NSD_Uncheck} $EncodeThisCheckResolve
    ${EndIf}
    ${If} $EncodeThisHasPremiere == "1"
      ${NSD_Check} $EncodeThisCheckPremiere
    ${Else}
      ${NSD_Uncheck} $EncodeThisCheckPremiere
    ${EndIf}
    EnableWindow $EncodeThisCheckAE 0
    EnableWindow $EncodeThisCheckResolve 0
    EnableWindow $EncodeThisCheckPremiere 0
  FunctionEnd

  Function EncodeThisApplyCustomMode
    ; Custom: always allow choosing any host app
    EnableWindow $EncodeThisCheckAE 1
    EnableWindow $EncodeThisCheckResolve 1
    EnableWindow $EncodeThisCheckPremiere 1
  FunctionEnd

  Function EncodeThisOnInstallMode
    ; Prefer Custom radio state — avoids race when Standard still looks checked mid-click
    ${NSD_GetState} $EncodeThisRadioCustom $0
    ${If} $0 == ${BST_CHECKED}
      Call EncodeThisApplyCustomMode
    ${Else}
      Call EncodeThisApplyStandardMode
    ${EndIf}
  FunctionEnd

  Function EncodeThisIntegrationsPageLeave
    ${NSD_GetState} $EncodeThisRadioCustom $0
    ${If} $0 == ${BST_CHECKED}
      StrCpy $EncodeThisInstallMode "custom"
      ${NSD_GetState} $EncodeThisCheckAE $1
      ${If} $1 == ${BST_CHECKED}
        StrCpy $EncodeThisInstallAE "true"
      ${Else}
        StrCpy $EncodeThisInstallAE "false"
      ${EndIf}
      ${NSD_GetState} $EncodeThisCheckResolve $1
      ${If} $1 == ${BST_CHECKED}
        StrCpy $EncodeThisInstallResolve "true"
      ${Else}
        StrCpy $EncodeThisInstallResolve "false"
      ${EndIf}
      ${NSD_GetState} $EncodeThisCheckPremiere $1
      ${If} $1 == ${BST_CHECKED}
        StrCpy $EncodeThisInstallPremiere "true"
      ${Else}
        StrCpy $EncodeThisInstallPremiere "false"
      ${EndIf}
    ${Else}
      StrCpy $EncodeThisInstallMode "standard"
      ${If} $EncodeThisHasAE == "1"
        StrCpy $EncodeThisInstallAE "true"
      ${Else}
        StrCpy $EncodeThisInstallAE "false"
      ${EndIf}
      ${If} $EncodeThisHasResolve == "1"
        StrCpy $EncodeThisInstallResolve "true"
      ${Else}
        StrCpy $EncodeThisInstallResolve "false"
      ${EndIf}
      ${If} $EncodeThisHasPremiere == "1"
        StrCpy $EncodeThisInstallPremiere "true"
      ${Else}
        StrCpy $EncodeThisInstallPremiere "false"
      ${EndIf}
    ${EndIf}
  FunctionEnd

  Function EncodeThisRunHostSetup
    ${If} $EncodeThisInstallMode == ""
      Call EncodeThisDetectHostApps
      StrCpy $EncodeThisInstallMode "standard"
      ${If} $EncodeThisHasAE == "1"
        StrCpy $EncodeThisInstallAE "true"
      ${Else}
        StrCpy $EncodeThisInstallAE "false"
      ${EndIf}
      ${If} $EncodeThisHasResolve == "1"
        StrCpy $EncodeThisInstallResolve "true"
      ${Else}
        StrCpy $EncodeThisInstallResolve "false"
      ${EndIf}
      ${If} $EncodeThisHasPremiere == "1"
        StrCpy $EncodeThisInstallPremiere "true"
      ${Else}
        StrCpy $EncodeThisInstallPremiere "false"
      ${EndIf}
    ${EndIf}

    CreateDirectory "$PROFILE\Videos\Encode This"
    CreateDirectory "$PROFILE\Videos\Encode This\Output"
    CreateDirectory "$APPDATA\Encode This"

    FileOpen $0 "$PROFILE\Videos\Encode This\Output\README.txt" w
    FileWrite $0 "Default encode output for watched host folders.$\r$\n"
    FileClose $0

    ${If} $EncodeThisInstallAE == "true"
      CreateDirectory "$PROFILE\Videos\Encode This\from-ae"
      FileOpen $0 "$PROFILE\Videos\Encode This\from-ae\README.txt" w
      FileWrite $0 "Render After Effects Output Module files into this folder. Encode This watches it automatically.$\r$\n"
      FileClose $0
    ${EndIf}

    ${If} $EncodeThisInstallResolve == "true"
      CreateDirectory "$PROFILE\Videos\Encode This\from-resolve"
      FileOpen $0 "$PROFILE\Videos\Encode This\from-resolve\README.txt" w
      FileWrite $0 "Set DaVinci Resolve Deliver destination to this folder. Encode This watches it automatically.$\r$\n"
      FileClose $0
    ${EndIf}

    ${If} $EncodeThisInstallPremiere == "true"
      CreateDirectory "$PROFILE\Videos\Encode This\from-premiere"
      FileOpen $0 "$PROFILE\Videos\Encode This\from-premiere\README.txt" w
      FileWrite $0 "Export from Premiere Pro into this folder. Encode This watches it automatically.$\r$\n"
      FileClose $0
    ${EndIf}

    FileOpen $0 "$APPDATA\Encode This\install-options.json" w
    FileWrite $0 '{"mode":"'
    FileWrite $0 $EncodeThisInstallMode
    FileWrite $0 '","afterEffects":'
    FileWrite $0 $EncodeThisInstallAE
    FileWrite $0 ',"resolve":'
    FileWrite $0 $EncodeThisInstallResolve
    FileWrite $0 ',"premiere":'
    FileWrite $0 $EncodeThisInstallPremiere
    FileWrite $0 '}$\r$\n'
    FileClose $0
  FunctionEnd
!endif
