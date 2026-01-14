import { useFocusEffect } from "@react-navigation/native";
import { Accelerometer } from "expo-sensors";
import React, { useCallback, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

/* ---------------- Types ---------------- */

type AccelerometerData = {
  x: number;
  y: number;
  z: number;
};

/* ---------------- Tuned Parameters ---------------- */

// Gravity estimation (very slow)
const ALPHA_GRAVITY = 0.9;

// Step band smoothing (faster)
const ALPHA_STEP = 0.75;

// Noise rejection
const DEAD_ZONE = 0.08;

// Hysteresis thresholds
const STEP_THRESHOLD_HIGH = 0.06; // step strength
const STEP_THRESHOLD_LOW = 0.12; // re-arm

// Timing
const MIN_STEP_INTERVAL = 350; // ms

/* ---------------- Component ---------------- */

const RideScreen: React.FC = () => {
  const [tiltData, setTiltData] = useState<AccelerometerData>({
    x: 0,
    y: 0,
    z: 0,
  });

  const [gravity, setGravity] = useState(0);
  const [stepSignal, setStepSignal] = useState(0);
  const [stepCount, setStepCount] = useState(0);

  /* ---------------- Refs (no re-renders) ---------------- */

  const gravityRef = useRef(0);
  const stepSignalRef = useRef(0);
  const lastStepTimeRef = useRef(0);
  const aboveThresholdRef = useRef(false);

  /* ---------------- Processing ---------------- */

  const processSample = (x: number, y: number, z: number) => {
    // Orientation-independent magnitude
    const mag = Math.sqrt(x * x + y * y + z * z);

    // 1️⃣ Gravity LPF
    gravityRef.current =
      ALPHA_GRAVITY * gravityRef.current +
      (1 - ALPHA_GRAVITY) * mag;

    // 2️⃣ Remove gravity
    const dynamic = mag - gravityRef.current;

    // 3️⃣ Step-band LPF
    stepSignalRef.current =
      ALPHA_STEP * stepSignalRef.current +
      (1 - ALPHA_STEP) * dynamic;

    // 4️⃣ Dead-zone noise suppression
    const gatedSignal =
      Math.abs(stepSignalRef.current) < DEAD_ZONE
        ? 0
        : stepSignalRef.current;

    // Debug UI values
    setGravity(gravityRef.current);
    setStepSignal(gatedSignal);

    // 5️⃣ Detect step
    detectStep(gatedSignal);
  };

  const detectStep = (value: number) => {
    const now = Date.now();

    // Rising edge → count step
    if (
      !aboveThresholdRef.current &&
      value > STEP_THRESHOLD_HIGH &&
      now - lastStepTimeRef.current > MIN_STEP_INTERVAL
    ) {
      setStepCount((s) => s + 1);
      lastStepTimeRef.current = now;
      aboveThresholdRef.current = true;
    }

    // Falling edge → re-arm detector
    if (
      aboveThresholdRef.current &&
      value < STEP_THRESHOLD_LOW
    ) {
      aboveThresholdRef.current = false;
    }
  };

  /* ---------------- Sensor Subscription ---------------- */

  useFocusEffect(
    useCallback(() => {
      Accelerometer.setUpdateInterval(50);

      const subscription = Accelerometer.addListener(
        (data: AccelerometerData) => {
          setTiltData(data);
          processSample(data.x, data.y, data.z);
        }
      );

      return () => subscription.remove();
    }, [])
  );

  /* ---------------- UI ---------------- */

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Step Counter</Text>

      <View style={styles.dataBox}>
        <Text style={styles.dataText}>
          X: {tiltData.x.toFixed(3)}
        </Text>
        <Text style={styles.dataText}>
          Y: {tiltData.y.toFixed(3)}
        </Text>
        <Text style={styles.dataText}>
          Z: {tiltData.z.toFixed(3)}
        </Text>

        <View style={styles.separator} />

        <Text style={styles.dataText}>
          Gravity: {gravity.toFixed(3)}
        </Text>
        <Text style={styles.dataText}>
          Step signal: {stepSignal.toFixed(3)}
        </Text>

        <View style={styles.separator} />

        <Text style={styles.stepText}>
          Steps: {stepCount}
        </Text>
      </View>
    </View>
  );
};

/* ---------------- Styles ---------------- */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#111",
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 30,
  },
  dataBox: {
    backgroundColor: "#222",
    padding: 25,
    borderRadius: 12,
    width: "80%",
    maxWidth: 360,
  },
  dataText: {
    fontSize: 18,
    color: "#00ffcc",
    marginVertical: 4,
    textAlign: "center",
    fontFamily: "monospace",
  },
  stepText: {
    fontSize: 26,
    color: "#ffcc00",
    marginTop: 12,
    textAlign: "center",
    fontWeight: "bold",
  },
  separator: {
    height: 1,
    backgroundColor: "#444",
    marginVertical: 10,
  },
});

export default RideScreen;
