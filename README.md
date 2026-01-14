Step Counter App (Expo)

This is an **Expo + React Native** application that measures **steps using the phone’s accelerometer**.

## 📊 How it works
- Reads raw accelerometer data (`x`, `y`, `z`)
- Computes the **movement vector magnitude**
- Applies **low-pass filters (LPFs)** to:
  - estimate and remove gravity
  - reduce sensor noise
- Detects steps by identifying **motion peaks** in the filtered signal

The algorithm is designed to minimize false positives caused by small hand movements or sensor noise.

## ▶️ Run the app

```bash
npm install
npx expo start