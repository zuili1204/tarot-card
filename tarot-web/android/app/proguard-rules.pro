# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# If your project uses WebView with JS, uncomment the following
# and specify the fully qualified class name to the JavaScript interface
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}

# Capacitor 通过注解/反射发现插件，R8 必须保留（09 §5 M3）
-keep class com.getcapacitor.** { *; }
-keep class com.tarot.app.** { *; }
-keep class org.apache.cordova.** { *; }
-keepattributes *Annotation*
-keepclassmembers class * {
    @com.getcapacitor.PluginMethod *;
}

# If you keep the line number information, uncomment this to
# hide the original source file name.
#-renamesourcefileattribute SourceFile
