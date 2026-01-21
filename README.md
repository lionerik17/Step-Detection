# Step Counter App (Expo)

This is an **Expo + React Native** application that measures **user steps using the phone’s accelerometer**.

## How it works
- Reads raw accelerometer data (`x`, `y`, `z`) from the phone sensors
- Computes the **acceleration vector magnitude** to eliminate dependence on phone orientation
- Applies **low-pass filters (LPFs)** to:
  - estimate and remove the gravity component from the signal
  - smooth the resulting dynamic acceleration to reduce high-frequency noise
- Uses an **activity gate** to ignore very small movements and suppress sensor noise
- Computes an **adaptive detection threshold** based on the recent energy of the signal
- Detects steps by identifying a **peak–valley–peak pattern** in the filtered dynamic acceleration, together with temporal constraints between consecutive steps.

This approach ensures that only complete, step-like oscillations are counted, significantly reducing false positives caused by phone shaking or sporadic movements.

## Run the app

```bash
npm install
npx expo start
