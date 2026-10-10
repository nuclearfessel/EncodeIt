; Windows NSIS — Standard vs Custom host integrations.
; Detects After Effects / DaVinci Resolve / Premiere before creating folders.
; Standard = only detected apps. Custom = choose among detected apps.

!include "nsDialogs.nsh"
!include "LogicLib.nsh"

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

!macro customPageAfterChangeDir
  Page custom EncodeThisIntegrationsPageCreate EncodeThisIntegrationsPageLeave
!macroend

Function EncodeThisMarkIfAdobeAE
  ; $R9 = search root (e.g. $PROGRAMFILES\Adobe)
  Push $R0
  Push $R1
  ClearErrors
  FindFirst $R0 $R1 "$R9\Adobe After Effects *"
  ${IfNot} ${Errors}
    StrCpy $EncodeThisHasAE "1"
    FindClose $R0
  ${EndIf}
  Pop $R1
  Pop $R0
FunctionEnd

Function EncodeThisMarkIfAdobePR
  Push $R0
  Push $R1
  ClearErrors
  FindFirst $R0 $R1 "$R9\Adobe Premiere Pro *"
  ${IfNot} ${Errors}
    StrCpy $EncodeThisHasPremiere "1"
    FindClose $R0
  ${EndIf}
  Pop $R1
  Pop $R0
FunctionEnd

Function EncodeThisDetectHostApps
  StrCpy $EncodeThisHasAE "0"
  StrCpy $EncodeThisHasResolve "0"
  StrCpy $EncodeThisHasPremiere "0"

  StrCpy $R9 "$PROGRAMFILES\Adobe"
  Call EncodeThisMarkIfAdobeAE
  Call EncodeThisMarkIfAdobePR

  ; 32-bit Program Files on 64-bit Windows
  StrCpy $R9 "$PROGRAMFILES32\Adobe"
  Call EncodeThisMarkIfAdobeAE
  Call EncodeThisMarkIfAdobePR

  IfFileExists "$PROGRAMFILES\Blackmagic Design\DaVinci Resolve\Resolve.exe" 0 +2
    StrCpy $EncodeThisHasResolve "1"
  IfFileExists "$PROGRAMFILES32\Blackmagic Design\DaVinci Resolve\Resolve.exe" 0 +2
    StrCpy $EncodeThisHasResolve "1"
  IfFileExists "$LOCALAPPDATA\Blackmagic Design\DaVinci Resolve" 0 +2
    StrCpy $EncodeThisHasResolve "1"
FunctionEnd

Function EncodeThisIntegrationsPageCreate
  Call EncodeThisDetectHostApps

  !insertmacro MUI_HEADER_TEXT "Host integrations" "Standard sets up only apps found on this PC. Custom lets you choose among detected apps."

  nsDialogs::Create 1018
  Pop $EncodeThisIntegrationsDialog
  ${If} $EncodeThisIntegrationsDialog == error
    Abort
  ${EndIf}

  ${NSD_CreateLabel} 0 0 100% 36u "Folders are created only for host apps that are installed. Unavailable apps stay off."
  Pop $0

  ${NSD_CreateRadioButton} 0 40u 100% 14u "Standard install — set up every detected host app"
  Pop $EncodeThisRadioStandard
  ${NSD_Check} $EncodeThisRadioStandard

  ${NSD_CreateRadioButton} 0 58u 100% 14u "Custom install — choose among detected apps"
  Pop $EncodeThisRadioCustom

  ${NSD_CreateCheckbox} 18u 84u 100% 12u "After Effects"
  Pop $EncodeThisCheckAE
  ${If} $EncodeThisHasAE == "1"
    ${NSD_Check} $EncodeThisCheckAE
  ${Else}
    ${NSD_Uncheck} $EncodeThisCheckAE
    EnableWindow $EncodeThisCheckAE 0
  ${EndIf}

  ${NSD_CreateCheckbox} 18u 102u 100% 12u "DaVinci Resolve"
  Pop $EncodeThisCheckResolve
  ${If} $EncodeThisHasResolve == "1"
    ${NSD_Check} $EncodeThisCheckResolve
  ${Else}
    ${NSD_Uncheck} $EncodeThisCheckResolve
    EnableWindow $EncodeThisCheckResolve 0
  ${EndIf}

  ${NSD_CreateCheckbox} 18u 120u 100% 12u "Premiere Pro"
  Pop $EncodeThisCheckPremiere
  ${If} $EncodeThisHasPremiere == "1"
    ${NSD_Check} $EncodeThisCheckPremiere
  ${Else}
    ${NSD_Uncheck} $EncodeThisCheckPremiere
    EnableWindow $EncodeThisCheckPremiere 0
  ${EndIf}

  ${NSD_OnClick} $EncodeThisRadioStandard EncodeThisOnInstallMode
  ${NSD_OnClick} $EncodeThisRadioCustom EncodeThisOnInstallMode
  Call EncodeThisOnInstallMode

  nsDialogs::Show
FunctionEnd

Function EncodeThisOnInstallMode
  ${NSD_GetState} $EncodeThisRadioStandard $0
  ${If} $0 == ${BST_CHECKED}
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
  ${Else}
    ${If} $EncodeThisHasAE == "1"
      EnableWindow $EncodeThisCheckAE 1
    ${Else}
      EnableWindow $EncodeThisCheckAE 0
      ${NSD_Uncheck} $EncodeThisCheckAE
    ${EndIf}
    ${If} $EncodeThisHasResolve == "1"
      EnableWindow $EncodeThisCheckResolve 1
    ${Else}
      EnableWindow $EncodeThisCheckResolve 0
      ${NSD_Uncheck} $EncodeThisCheckResolve
    ${EndIf}
    ${If} $EncodeThisHasPremiere == "1"
      EnableWindow $EncodeThisCheckPremiere 1
    ${Else}
      EnableWindow $EncodeThisCheckPremiere 0
      ${NSD_Uncheck} $EncodeThisCheckPremiere
    ${EndIf}
  ${EndIf}
FunctionEnd

Function EncodeThisIntegrationsPageLeave
  ${NSD_GetState} $EncodeThisRadioStandard $0
  ${If} $0 == ${BST_CHECKED}
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
  ${Else}
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
  ${EndIf}
FunctionEnd

!macro customInstall
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
!macroend
