import { useFocusEffect } from "@react-navigation/native";
import { Accelerometer } from "expo-sensors";
import React, { useCallback, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

/* ---------------- Parameters ---------------- */

// Gravity estimation
const ALPHA_GRAVITY = 0.9;

// Timing (pace)
const MIN_STEP_PERIOD = 500; // ms
const MAX_STEP_PERIOD = 1000; // ms

// Noise gate
const MIN_ACTIVITY_LEVEL = 0.03;

// Adaptive threshold
const ENERGY_ALPHA = 0.95;
const MIN_PEAK_THRESHOLD = 0.2;
const THRESHOLD_GAIN = 1.5;

/* ---------------- Component ---------------- */

const StepScreen: React.FC = () => {
  const [stepCount, setStepCount] = useState(0);
  const [, setDynValue] = useState(0);
  const [, setDiffValue] = useState(0);

  // Gravity estimation
  const gravityMagRef = useRef(0);

  // Signal history
  const prevDynRef = useRef(0);
  const prevPrevDynRef = useRef(0);

  // Step logic
  const lastPeakTimeRef = useRef(0);
  const pendingPeakRef = useRef(false);
  const lastWasValleyRef = useRef(false);

  // Adaptive threshold energy
  const energyRef = useRef(0);

  /* ---------------- Processing ---------------- */

  const processSample = (x: number, y: number, z: number) => {
    // Raw magnitude
    const magRaw = Math.sqrt(x * x + y * y + z * z);

    // Gravity LPF
    gravityMagRef.current =
      ALPHA_GRAVITY * gravityMagRef.current +
      (1 - ALPHA_GRAVITY) * magRaw;

    // Dynamic magnitude
    const dyn = magRaw - gravityMagRef.current;

    setDynValue(dyn);

    detectStep(dyn);
  };

  const detectStep = (dyn: number) => {
    const now = Date.now();

    /* -------- Noise / activity gate -------- */
    if (Math.abs(dyn) < MIN_ACTIVITY_LEVEL) {
      return;
    }

    /* -------- Adaptive threshold update -------- */
    energyRef.current =
      ENERGY_ALPHA * energyRef.current +
      (1 - ENERGY_ALPHA) * Math.abs(dyn);

    const adaptiveThreshold = Math.max(
      MIN_PEAK_THRESHOLD,
      energyRef.current * THRESHOLD_GAIN
    );

    /* -------- Valley detection -------- */
    const isValley =
      prevDynRef.current < prevPrevDynRef.current &&
      prevDynRef.current < dyn &&
      prevDynRef.current < -adaptiveThreshold / 2;

    if (isValley) {
      lastWasValleyRef.current = true;
    }

    /* -------- Peak detection -------- */
    const isPeak =
      prevDynRef.current > prevPrevDynRef.current &&
      prevDynRef.current > dyn &&
      prevDynRef.current > adaptiveThreshold;

    if (isPeak) {
      const dt = now - lastPeakTimeRef.current;

      if (
        pendingPeakRef.current &&
        lastWasValleyRef.current &&
        dt > MIN_STEP_PERIOD &&
        dt < MAX_STEP_PERIOD
      ) {
        // Confirmed step
        setStepCount(s => s + 1);
        pendingPeakRef.current = false;
        lastWasValleyRef.current = false;
      } else {
        // First peak candidate
        pendingPeakRef.current = true;
      }

      lastPeakTimeRef.current = now;
    }

    /* -------- Shift history -------- */
    prevPrevDynRef.current = prevDynRef.current;
    prevDynRef.current = dyn;
  };

  /* ---------------- Sensor ---------------- */

  useFocusEffect(
    useCallback(() => {
      Accelerometer.setUpdateInterval(50);

      const sub = Accelerometer.addListener(
        ({ x, y, z }) => processSample(x, y, z)
      );

      return () => sub.remove();
    }, [])
  );

  /* ---------------- UI ---------------- */

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Step Counter</Text>
      <Text style={styles.steps}>Steps: {stepCount}</Text>
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
    color: "#fff",
    fontWeight: "bold",
    marginBottom: 20,
  },
  card: {
    backgroundColor: "#222",
    padding: 30,
    borderRadius: 12,
    alignItems: "center",
    width: "80%",
    maxWidth: 300,
  },
  label: {
    color: "#aaa",
    fontSize: 14,
    marginTop: 10,
  },
  value: {
    color: "#00ffcc",
    fontSize: 18,
    fontFamily: "monospace",
  },
  steps: {
    marginTop: 20,
    fontSize: 28,
    color: "#ffcc00",
    fontWeight: "bold",
  },
});

export default StepScreen;
