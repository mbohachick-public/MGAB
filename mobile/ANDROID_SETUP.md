# Fix: Android SDK and Java (JAVA_HOME) errors

## Fix: JAVA_HOME not set

The Android build tools need a **Java JDK**. If you see an error about **JAVA_HOME** or "Java not found", do this:

### If you use Android Studio

Android Studio includes a JDK. Point **JAVA_HOME** at it:

1. **Find the bundled JDK** (one of these usually exists):
   - `C:\Program Files\Android\Android Studio\jbr`
   - or `C:\Program Files\Android\Android Studio\jre`

2. **Set JAVA_HOME**
   - Press **Win + R** → type `sysdm.cpl` → Enter.
   - **Advanced** tab → **Environment Variables**.
   - Under **User variables**, click **New**.
   - Variable name: `JAVA_HOME`
   - Variable value: `C:\Program Files\Android\Android Studio\jbr` (use the path that exists on your PC).
   - Click **OK**.

3. **Add Java to PATH** (optional but helpful)
   - Edit **Path** → **New** → add: `%JAVA_HOME%\bin`
   - Click **OK** on all dialogs.

4. **Restart your terminal** and run `npx expo run:android` again.

### If you don’t use Android Studio

Install a JDK (e.g. **Eclipse Temurin 17** from https://adoptium.net/ ), then set **JAVA_HOME** to the JDK install folder (e.g. `C:\Program Files\Eclipse Adoptium\jdk-17.x.x-hotspot`) and add `%JAVA_HOME%\bin` to **Path**.

---

## Fix: Android SDK not found

The error means either the **Android SDK is not installed** or **ANDROID_HOME is not set**.

## Option 1: Install Android Studio (recommended)

1. **Download Android Studio**  
   https://developer.android.com/studio

2. **Install it** and open Android Studio.

3. **Install the Android SDK**
   - Go to **More Actions** → **SDK Manager** (or **File** → **Settings** → **Appearance & Behavior** → **System Settings** → **Android SDK**).
   - On the **SDK Platforms** tab, install at least one version (e.g. **Android 14.0 (API 34)**).
   - On the **SDK Tools** tab, ensure **Android SDK Platform-Tools** and **Android SDK Build-Tools** are installed.
   - Note the **Android SDK Location** at the top (e.g. `C:\Users\bohac\AppData\Local\Android\Sdk`).

4. **Set ANDROID_HOME**
   - Press **Win + R**, type `sysdm.cpl`, Enter.
   - **Advanced** tab → **Environment Variables**.
   - Under **User variables** (or **System variables**), click **New**.
   - Variable name: `ANDROID_HOME`
   - Variable value: the SDK path from step 3 (e.g. `C:\Users\bohac\AppData\Local\Android\Sdk`).
   - Click **OK**.

5. **Add platform-tools to PATH**
   - In **Environment Variables**, select **Path** → **Edit** → **New**.
   - Add: `%ANDROID_HOME%\platform-tools`
   - Add: `%ANDROID_HOME%\emulator` (optional, for emulator).
   - Click **OK** on all dialogs.

6. **Restart your terminal** (and Cursor/IDE if you use its terminal), then run:
   ```powershell
   cd mobile
   npx expo run:android
   ```

---

## Option 2: Set ANDROID_HOME for current session only

If the SDK is **already installed** but only the variable is missing:

1. Find your SDK path (e.g. `C:\Users\bohac\AppData\Local\Android\Sdk`).

2. In PowerShell, run (replace with your actual path):
   ```powershell
   $env:ANDROID_HOME = "C:\Users\bohac\AppData\Local\Android\Sdk"
   $env:Path += ";$env:ANDROID_HOME\platform-tools"
   ```

3. Then from the `mobile` folder:
   ```powershell
   npx expo run:android
   ```

This only lasts until you close the terminal. To fix it permanently, use Option 1 step 4–5.

---

## Verify

In a **new** PowerShell window:

```powershell
echo $env:ANDROID_HOME
echo $env:JAVA_HOME
adb version
java -version
```

You should see your SDK path, Java path, ADB version, and Java version. If anything is missing, set the matching variable and add the right folder to **Path** as above.
