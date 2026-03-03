!macro customInstall
  ; Python is bundled - bootstrap pip and install dependencies using bundled Python
  DetailPrint "Setting up bundled Python environment..."

  ; Bootstrap pip
  nsExec::ExecToStack 'cmd /c ""$INSTDIR\resources\python-env\python.exe" "$INSTDIR\resources\python-env\get-pip.py" --no-warn-script-location"'
  Pop $0
  ${If} $0 == 0
    DetailPrint "pip installed successfully"
  ${Else}
    DetailPrint "pip bootstrap returned code $0 (may already be installed)"
  ${EndIf}

  ; Install dependencies
  DetailPrint "Installing Python dependencies (this may take a minute)..."
  nsExec::ExecToStack 'cmd /c ""$INSTDIR\resources\python-env\python.exe" -m pip install -r "$INSTDIR\resources\backend\requirements.txt" --no-warn-script-location --quiet"'
  Pop $0
  ${If} $0 == 0
    DetailPrint "Python dependencies installed successfully!"
  ${Else}
    DetailPrint "Dependency install returned code $0 - will retry on first launch"
  ${EndIf}
!macroend
