; Windows NSIS — Standard vs Custom host integrations (installer).
; Clean install checkbox: wipe previous settings/plugins (optional media) even on upgrade.
; Uninstall: wipe app data + plugins; ask whether to keep Videos\EncodeIt media.
; Detection = install folders / Resolve.exe on disk (apps do NOT need to be running).
; Standard: pre-checks apps found on this PC (folders only for those).
; Custom: user can choose any combination; checkboxes are always selectable.

!include "nsDialogs.nsh"
!include "LogicLib.nsh"
!include "WinMessages.nsh"

; Dark asphalt MUI chrome — top-level defines (installer.nsh is prepended before
; MUI2/pages). Do NOT put these in customHeader: electron-builder inserts that
; macro after assisted pages, which already defines MUI_BGCOLOR and breaks NSIS.
!ifndef MUI_BGCOLOR
  !define MUI_BGCOLOR 101214
!endif
!ifndef MUI_TEXTCOLOR
  !define MUI_TEXTCOLOR E8EAED
!endif
!ifndef MUI_HEADERTEXT_COLOR
  !define MUI_HEADERTEXT_COLOR E8EAED
!endif
!ifndef MUI_INSTFILESPAGE_COLORS
  !define MUI_INSTFILESPAGE_COLORS "E8EAED 101214"
!endif
!ifndef MUI_LICENSEPAGE_BGCOLOR
  !define MUI_LICENSEPAGE_BGCOLOR 101214
!endif
!ifndef MUI_DIRECTORYPAGE_BGCOLOR
  !define MUI_DIRECTORYPAGE_BGCOLOR 171A1D
!endif
!ifndef MUI_DIRECTORYPAGE_TEXTCOLOR
  !define MUI_DIRECTORYPAGE_TEXTCOLOR E8EAED
!endif

; Finish.nsh only SetWindowTheme’s run/readme checkboxes in high-contrast unless
; this is set — without it, visual styles keep near-black label text (bug #443).
!ifndef MUI_FORCECLASSICCONTROLS
  !define MUI_FORCECLASSICCONTROLS
!endif

; Empty branding string — MUI’s SetCtlColors /BRANDING draws an embossed
; “drop shadow” on $(^Branding); blanking it removes the ghosted EncodeIt 1.0.0.
BrandingText " "

; Keep-media flag — installer (Clean install) and uninstaller both use this.
Var EncodeItKeepMedia
Var EncodeItThemeParent

; Soft coral on asphalt — match app dark theme as far as classic Win32 allows.
; Installer and uninstaller each need their own functions (NSIS cannot Call across).
; Per-page SHOW is re-armed in build/assistedInstaller.nsh (MUI undefs it each page).

!macro EncodeItFlatControl HWND_ FG_ BG_
  System::Call 'uxtheme::SetWindowTheme(p${HWND_}, w" ", w" ")'
  SetCtlColors ${HWND_} ${FG_} ${BG_}
!macroend

!macro EncodeItThemeChildWindowsImpl
  Exch $EncodeItThemeParent
  Push $0
  System::Call 'user32::GetWindow(p$EncodeItThemeParent, i5) p.r0' ; GW_CHILD
  ${While} $0 != 0
    !insertmacro EncodeItFlatControl $0 0xE8EAED 0x101214
    System::Call 'user32::GetWindow(p$0, i2) p.r0' ; GW_HWNDNEXT
  ${EndWhile}
  Pop $0
  Pop $EncodeItThemeParent
!macroend

!macro EncodeItThemeInnerDialogImpl UNPREFIX
  Push $0
  FindWindow $0 "#32770" "" $HWNDPARENT
  ${If} $0 != 0
    !insertmacro EncodeItFlatControl $0 0xE8EAED 0x101214
    Push $0
    Call ${UNPREFIX}EncodeItThemeChildWindows
  ${EndIf}
  Pop $0
!macroend

; Finish / welcome replace dialog item 1044 with an nsDialog. The usual
; #32770 walk never reaches “Run EncodeIt”. Theme 1044 + its children
; (FlatControl strips uxtheme — MUI bug #443).
!macro EncodeItThemeFinishRunImpl UNPREFIX
  Push $0

  GetDlgItem $0 $HWNDPARENT 1044
  ${If} $0 != 0
    !insertmacro EncodeItFlatControl $0 0xE8EAED 0x101214
    Push $0
    Call ${UNPREFIX}EncodeItThemeChildWindows
  ${EndIf}

  Pop $0
!macroend

!macro EncodeItThemeButtonImpl CTRL
  GetDlgItem $0 $HWNDPARENT ${CTRL}
  ${If} $0 != 0
    ; Elevated asphalt face — not the stock white classic buttons.
    !insertmacro EncodeItFlatControl $0 0xE8EAED 0x212529
    System::Call 'user32::InvalidateRect(p$0, p0, i1)'
  ${EndIf}
!macroend

!macro EncodeItThemeOuterImpl
  Push $0
  SetCtlColors $HWNDPARENT 0xE8EAED 0x101214

  GetDlgItem $0 $HWNDPARENT 1034 ; header background
  ${If} $0 != 0
    SetCtlColors $0 "" 0x101214
  ${EndIf}
  GetDlgItem $0 $HWNDPARENT 1037 ; header title
  ${If} $0 != 0
    !insertmacro EncodeItFlatControl $0 0xE8EAED 0x101214
  ${EndIf}
  GetDlgItem $0 $HWNDPARENT 1038 ; header subtitle
  ${If} $0 != 0
    !insertmacro EncodeItFlatControl $0 0xA8ADB4 0x101214
  ${EndIf}

  ; Kill MUI /BRANDING emboss (offset “drop shadow”) on the footer version.
  ; Prefer MUI’s cached HWNDs; also flatten colors in case the control is reshown.
  StrCpy $0 $mui.Branding.Text
  ${If} $0 == 0
    GetDlgItem $0 $HWNDPARENT 1256
  ${EndIf}
  ${If} $0 != 0
    !insertmacro EncodeItFlatControl $0 0x101214 0x101214
    SendMessage $0 ${WM_SETTEXT} 0 "STR: "
    ShowWindow $0 ${SW_HIDE}
  ${EndIf}
  StrCpy $0 $mui.Branding.Background
  ${If} $0 == 0
    GetDlgItem $0 $HWNDPARENT 1028
  ${EndIf}
  ${If} $0 != 0
    !insertmacro EncodeItFlatControl $0 0x101214 0x101214
    ShowWindow $0 ${SW_HIDE}
  ${EndIf}

  ; Kill the bright hairline under the header
  GetDlgItem $0 $HWNDPARENT 1035
  ${If} $0 != 0
    ShowWindow $0 ${SW_HIDE}
  ${EndIf}

  ; Next / Cancel / Back
  !insertmacro EncodeItThemeButtonImpl 1
  !insertmacro EncodeItThemeButtonImpl 2
  !insertmacro EncodeItThemeButtonImpl 3

  Pop $0
!macroend

; Only emit the function set this makensis pass will reference (-WX treats
; unused installer/uninstaller counterparts as errors).
!ifndef BUILD_UNINSTALLER
  Function EncodeItThemeChildWindows
    !insertmacro EncodeItThemeChildWindowsImpl
  FunctionEnd
  Function EncodeItThemeInnerDialog
    !insertmacro EncodeItThemeInnerDialogImpl ""
  FunctionEnd
  Function EncodeItThemeOuter
    !insertmacro EncodeItThemeOuterImpl
  FunctionEnd
  Function EncodeItGuiInit
    Call EncodeItThemeOuter
  FunctionEnd
  Function EncodeItThemeFinishRun
    !insertmacro EncodeItThemeFinishRunImpl ""
  FunctionEnd
  Function EncodeItThemePageShow
    Call EncodeItThemeOuter
    Call EncodeItThemeInnerDialog
    Call EncodeItThemeFinishRun
  FunctionEnd
  !define MUI_CUSTOMFUNCTION_GUIINIT EncodeItGuiInit
!else
  Function un.EncodeItThemeChildWindows
    !insertmacro EncodeItThemeChildWindowsImpl
  FunctionEnd
  Function un.EncodeItThemeInnerDialog
    !insertmacro EncodeItThemeInnerDialogImpl "un."
  FunctionEnd
  Function un.EncodeItThemeOuter
    !insertmacro EncodeItThemeOuterImpl
  FunctionEnd
  Function un.EncodeItGuiInit
    Call un.EncodeItThemeOuter
  FunctionEnd
  Function un.EncodeItThemeFinishRun
    !insertmacro EncodeItThemeFinishRunImpl "un."
  FunctionEnd
  Function un.EncodeItThemePageShow
    Call un.EncodeItThemeOuter
    Call un.EncodeItThemeInnerDialog
    Call un.EncodeItThemeFinishRun
  FunctionEnd
  !define MUI_CUSTOMFUNCTION_UNGUIINIT un.EncodeItGuiInit
!endif

; Shared wipe used by real uninstall and by Clean install during Setup.
; Call after deciding media: $EncodeItKeepMedia = "1" to spare Videos\EncodeIt trees.
!macro EncodeItDoWipe
  SetShellVarContext current
  ${If} $EncodeItKeepMedia != "1"
    RMDir /r "$PROFILE\Videos\EncodeIt"
    RMDir /r "$PROFILE\Videos\Encode This"
  ${EndIf}
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
; When the Setup installer upgrades an existing install, electron-builder runs this
; uninstaller with --updated: skip data wipe so settings/queue/media survive, while
; the old Program Files copy is still replaced by the new version.
; (Use the Clean install checkbox on Setup to wipe during an upgrade instead.)
!macro customUnInstall
  ${ifNot} ${isUpdated}
    StrCpy $EncodeItKeepMedia "0"
    MessageBox MB_YESNO|MB_ICONEXCLAMATION|MB_DEFBUTTON1 \
      "Remove EncodeIt completely?$\r$\n$\r$\nYes = delete settings, plugins, AND media$\r$\n(Videos\EncodeIt).$\r$\n$\r$\nNo = delete settings/plugins but KEEP media." \
      IDYES encodeit_un_wipe
    StrCpy $EncodeItKeepMedia "1"
    encodeit_un_wipe:
    !insertmacro EncodeItDoWipe
  ${endIf}
!macroend

!ifndef BUILD_UNINSTALLER
  Var EncodeItIntegrationsDialog
  Var EncodeItRadioStandard
  Var EncodeItRadioCustom
  Var EncodeItCheckAE
  Var EncodeItCheckResolve
  Var EncodeItCheckPremiere
  Var EncodeItCheckClean
  Var EncodeItInstallAE
  Var EncodeItInstallResolve
  Var EncodeItInstallPremiere
  Var EncodeItInstallMode
  Var EncodeItCleanInstall
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

    ; Keep all controls inside the ~120u MUI inner pane so nothing is clipped.
    ; (Do not call MUI_HEADER_TEXT here — electron-builder's NSIS include
    ; context does not define that macro and the build will fail.)

    nsDialogs::Create 1018
    Pop $EncodeItIntegrationsDialog
    ${If} $EncodeItIntegrationsDialog == error
      Abort
    ${EndIf}
    Call EncodeItThemeOuter
    !insertmacro EncodeItFlatControl $EncodeItIntegrationsDialog 0xE8EAED 0x101214

    ${NSD_CreateLabel} 0 0 100% 12u "Standard uses apps found on this PC. Custom lets you pick AE, Resolve, and/or Premiere."
    Pop $0
    !insertmacro EncodeItFlatControl $0 0xE8EAED 0x101214

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
          StrCpy $EncodeItDetectNote "Detected: none (Custom can still create folders)"
        ${EndIf}
      ${EndIf}
    ${EndIf}
    ${NSD_CreateLabel} 0 14u 100% 10u "$EncodeItDetectNote"
    Pop $0
    !insertmacro EncodeItFlatControl $0 0xA8ADB4 0x101214

    ${NSD_CreateRadioButton} 0 28u 100% 12u "Standard install — set up every detected host app"
    Pop $EncodeItRadioStandard
    !insertmacro EncodeItFlatControl $EncodeItRadioStandard 0xE8EAED 0x101214
    ${NSD_Check} $EncodeItRadioStandard

    ${NSD_CreateRadioButton} 0 42u 100% 12u "Custom install — choose applications"
    Pop $EncodeItRadioCustom
    !insertmacro EncodeItFlatControl $EncodeItRadioCustom 0xE8EAED 0x101214

    ${NSD_CreateCheckbox} 18u 58u 100% 12u "After Effects"
    Pop $EncodeItCheckAE
    !insertmacro EncodeItFlatControl $EncodeItCheckAE 0xE8EAED 0x101214
    ${NSD_CreateCheckbox} 18u 72u 100% 12u "DaVinci Resolve"
    Pop $EncodeItCheckResolve
    !insertmacro EncodeItFlatControl $EncodeItCheckResolve 0xE8EAED 0x101214
    ${NSD_CreateCheckbox} 18u 86u 100% 12u "Premiere Pro"
    Pop $EncodeItCheckPremiere
    !insertmacro EncodeItFlatControl $EncodeItCheckPremiere 0xE8EAED 0x101214

    ; Ends ~112u — fully inside the pane. Media keep/wipe is asked on Install if checked.
    ${NSD_CreateCheckbox} 0 104u 100% 12u "Clean install — wipe previous settings and plugins"
    Pop $EncodeItCheckClean
    !insertmacro EncodeItFlatControl $EncodeItCheckClean 0xE8EAED 0x101214
    ${NSD_Uncheck} $EncodeItCheckClean

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
    ; Keep host checks enabled — DisableWindow draws embossed “shadow” labels on dark UI.
    ; Under Standard, clicks snap back to detection via EncodeItLockHostChecks.
    ${NSD_OnClick} $EncodeItCheckAE EncodeItLockHostChecks
    ${NSD_OnClick} $EncodeItCheckResolve EncodeItLockHostChecks
    ${NSD_OnClick} $EncodeItCheckPremiere EncodeItLockHostChecks
    Call EncodeItApplyStandardMode

    nsDialogs::Show
  FunctionEnd

  Function EncodeItThemeHostChecks
    !insertmacro EncodeItFlatControl $EncodeItCheckAE 0xE8EAED 0x101214
    !insertmacro EncodeItFlatControl $EncodeItCheckResolve 0xE8EAED 0x101214
    !insertmacro EncodeItFlatControl $EncodeItCheckPremiere 0xE8EAED 0x101214
  FunctionEnd

  Function EncodeItApplyStandardMode
    ; Selection is detection-driven — leave controls enabled so labels stay crisp.
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
    Call EncodeItThemeHostChecks
  FunctionEnd

  Function EncodeItApplyCustomMode
    Call EncodeItThemeHostChecks
  FunctionEnd

  Function EncodeItLockHostChecks
    ; Ignore toggles while Standard is selected
    ${NSD_GetState} $EncodeItRadioCustom $0
    ${If} $0 != ${BST_CHECKED}
      Call EncodeItApplyStandardMode
    ${EndIf}
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
    ${NSD_GetState} $EncodeItCheckClean $0
    ${If} $0 == ${BST_CHECKED}
      StrCpy $EncodeItCleanInstall "1"
    ${Else}
      StrCpy $EncodeItCleanInstall "0"
    ${EndIf}

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

  Function EncodeItMaybeCleanInstall
    ${If} $EncodeItCleanInstall != "1"
      Return
    ${EndIf}

    StrCpy $EncodeItKeepMedia "0"
    MessageBox MB_YESNO|MB_ICONEXCLAMATION|MB_DEFBUTTON2 \
      "Clean install removes previous settings and plugins.$\r$\n$\r$\nYes = also delete media (Videos\EncodeIt).$\r$\n$\r$\nNo = keep media; wipe settings/plugins only." \
      IDYES encodeit_ci_wipe
    StrCpy $EncodeItKeepMedia "1"
    encodeit_ci_wipe:
    !insertmacro EncodeItDoWipe
  FunctionEnd

  Function EncodeItRunHostSetup
    ${If} $EncodeItInstallMode == ""
      Call EncodeItDetectHostApps
      StrCpy $EncodeItInstallMode "standard"
      StrCpy $EncodeItCleanInstall "0"
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

    Call EncodeItMaybeCleanInstall

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
