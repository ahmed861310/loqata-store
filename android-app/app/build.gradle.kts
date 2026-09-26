plugins {
    id("com.android.application")
}

android {
    namespace = "com.loqata.store"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.loqata.store"
        minSdk = 26
        targetSdk = 36
        versionCode = 4
        versionName = "0.3.1"

        buildConfigField("String", "API_BASE_URL", "\"https://loqata-backend-production-14f7.up.railway.app\"")
        buildConfigField("String", "WHATSAPP_NUMBER", "\"201149902302\"")
    }

    buildFeatures {
        buildConfig = true
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

dependencies {
    implementation("androidx.appcompat:appcompat:1.7.1")
    implementation("androidx.recyclerview:recyclerview:1.4.0")
    implementation("androidx.constraintlayout:constraintlayout:2.2.1")
    implementation("androidx.lifecycle:lifecycle-runtime:2.9.4")
    implementation("com.google.android.material:material:1.13.0")
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation("com.google.code.gson:gson:2.13.1")
}
