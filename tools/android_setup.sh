#!/usr/bin/env bash
# Настройка Android-проекта Capacitor после `npx cap add android` (запускается в GitHub Actions).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP="$ROOT/android/app"
RES="$APP/src/main/res"
VERSION_NAME="${VERSION_NAME:-2.0}"
VERSION_CODE="${VERSION_CODE:-1}"

# 1. Иконки приложения
for d in mdpi hdpi xhdpi xxhdpi xxxhdpi; do cp -f "$ROOT/tools/android-res/mipmap-$d/"*.png "$RES/mipmap-$d/"; done
if [ -f "$RES/values/ic_launcher_background.xml" ]; then
  sed -i 's#<color name="ic_launcher_background">.*</color>#<color name="ic_launcher_background">\#030716</color>#' "$RES/values/ic_launcher_background.xml"
fi

# 1b. Заставка запуска вместо логотипа Capacitor
for f in $(cd "$ROOT/tools/android-res" && ls -d drawable*/splash.png 2>/dev/null); do cp -f "$ROOT/tools/android-res/$f" "$RES/$f"; done

# 2. Название, портретная ориентация, без поворотов
sed -i 's#<string name="app_name">.*</string>#<string name="app_name">VOID FRONTIER</string>#' "$RES/values/strings.xml"
sed -i 's#<string name="title_activity_main">.*</string>#<string name="title_activity_main">VOID FRONTIER</string>#' "$RES/values/strings.xml"
MANIFEST="$APP/src/main/AndroidManifest.xml"
grep -q 'screenOrientation' "$MANIFEST" || sed -i 's#android:name=".MainActivity"#android:name=".MainActivity"\n            android:screenOrientation="portrait"#' "$MANIFEST"

# 3. Версия
sed -i -E "s/versionCode [0-9]+/versionCode ${VERSION_CODE}/; s/versionName \"[^\"]*\"/versionName \"${VERSION_NAME}\"/" "$APP/build.gradle"

# 4. Полноэкранный режим и экран не гаснет во время игры
MAIN=$(find "$APP/src/main/java" -name MainActivity.java | head -1)
PKG=$(sed -n 's/^package \(.*\);/\1/p' "$MAIN")
cat > "$MAIN" <<JAVA
package ${PKG};

import android.os.Bundle;
import android.view.WindowManager;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        hideSystemBars();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) hideSystemBars();
    }

    private void hideSystemBars() {
        WindowInsetsControllerCompat c = WindowCompat.getInsetsController(getWindow(), getWindow().getDecorView());
        c.hide(WindowInsetsCompat.Type.systemBars());
        c.setSystemBarsBehavior(WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
    }
}
JAVA

# 5. Подпись release-сборки (только если в GitHub Secrets задан ключ)
if [ -n "${ANDROID_KEYSTORE_BASE64:-}" ]; then
  echo "$ANDROID_KEYSTORE_BASE64" | base64 -d > "$APP/release.jks"
  cat >> "$APP/build.gradle" <<'GRADLE'

android {
    signingConfigs {
        release {
            storeFile file('release.jks')
            storePassword System.getenv('ANDROID_KEYSTORE_PASSWORD')
            keyAlias System.getenv('ANDROID_KEY_ALIAS')
            keyPassword System.getenv('ANDROID_KEY_PASSWORD')
        }
    }
    buildTypes { release { signingConfig signingConfigs.release } }
}
GRADLE
fi
echo "Android project configured: version ${VERSION_NAME} (${VERSION_CODE})"
