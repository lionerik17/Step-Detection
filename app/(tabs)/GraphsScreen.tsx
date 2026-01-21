import { Picker } from "@react-native-picker/picker";
import { useFocusEffect } from "@react-navigation/native";
import { Accelerometer } from "expo-sensors";
import React, { useCallback, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Polyline } from "react-native-svg";

/* ---------------- Types ---------------- */

type AccSample = {
  x: number;
  y: number;
  z: number;
  magDyn: number; // |a| - g
};

/* ---------------- Parameters ---------------- */

const ALPHA = 0.9;
const BUFFER_SIZE = 120;

const GRAPH_WIDTH = 330;
const GRAPH_HEIGHT = 120;

/* ---------------- Component ---------------- */

const GraphsScreen: React.FC = () => {
  const [mode, setMode] = useState<"raw" | "filtered">("raw");
  const [samples, setSamples] = useState<AccSample[]>([]);

  // Axis LPF (for filtered view)
  const gravityAxisRef = useRef({ x: 0, y: 0, z: 0 });

  // Gravity magnitude LPF (for dynamic |a|)
  const gravityMagRef = useRef(0);

  /* ---------------- Processing ---------------- */

  const processSample = (x: number, y: number, z: number) => {
    // Raw magnitude
    const magRaw = Math.sqrt(x * x + y * y + z * z);

    // Gravity magnitude LPF
    gravityMagRef.current =
      ALPHA * gravityMagRef.current + (1 - ALPHA) * magRaw;

    // Dynamic magnitude
    const magDynamic = magRaw - gravityMagRef.current;

    // Axis LPF (visualization only)
    gravityAxisRef.current.x =
      ALPHA * gravityAxisRef.current.x + (1 - ALPHA) * x;
    gravityAxisRef.current.y =
      ALPHA * gravityAxisRef.current.y + (1 - ALPHA) * y;
    gravityAxisRef.current.z =
      ALPHA * gravityAxisRef.current.z + (1 - ALPHA) * z;

    const fx = gravityAxisRef.current.x;
    const fy = gravityAxisRef.current.y;
    const fz = gravityAxisRef.current.z;

    const sample: AccSample =
      mode === "raw"
        ? { x, y, z, magDyn: magDynamic }
        : { x: fx, y: fy, z: fz, magDyn: magDynamic };

    setSamples((prev) => {
      const next = [...prev, sample];
      return next.length > BUFFER_SIZE
        ? next.slice(next.length - BUFFER_SIZE)
        : next;
    });
  };

  /* ---------------- Sensor ---------------- */

  useFocusEffect(
    useCallback(() => {
      Accelerometer.setUpdateInterval(50);

      const sub = Accelerometer.addListener(
        ({ x, y, z }) => processSample(x, y, z)
      );

      return () => sub.remove();
    }, [mode])
  );

  /* ---------------- Graph Helpers ---------------- */

  const buildPolyline = (values: number[]) => {
    const max = Math.max(...values.map((v) => Math.abs(v)), 0.01);

    return values
      .map((v, i) => {
        const px = (i / (BUFFER_SIZE - 1)) * GRAPH_WIDTH;
        const py =
          GRAPH_HEIGHT / 2 -
          (v / max) * (GRAPH_HEIGHT / 2);
        return `${px},${py}`;
      })
      .join(" ");
  };

  const last = samples[samples.length - 1];

  const xVals = samples.map((s) => s.x);
  const yVals = samples.map((s) => s.y);
  const zVals = samples.map((s) => s.z);
  const magDynVals = samples.map((s) => s.magDyn);

  /* ---------------- UI ---------------- */

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Accelerometer Signals</Text>

      <Picker
        selectedValue={mode}
        style={styles.picker}
        onValueChange={(v) => setMode(v)}
      >
        <Picker.Item label="Raw axes" value="raw" />
        <Picker.Item label="Filtered axes (LPF)" value="filtered" />
      </Picker>

      {[
        {
          label: "X axis",
          data: xVals,
          color: "#ff5555",
          value: last?.x,
        },
        {
          label: "Y axis",
          data: yVals,
          color: "#55ff55",
          value: last?.y,
        },
        {
          label: "Z axis",
          data: zVals,
          color: "#5555ff",
          value: last?.z,
        },
        {
          label: "|a| dynamic (|a| − g)",
          data: magDynVals,
          color: "#ff00ff",
          value: last?.magDyn,
        },
      ].map((g) => (
        <View key={g.label} style={styles.graphBox}>
          <Text style={styles.graphTitle}>
            {g.label}{" "}
            {g.value !== undefined && (
              <Text style={styles.valueText}>
                ({g.value.toFixed(2)})
              </Text>
            )}
          </Text>

          <Svg width={GRAPH_WIDTH} height={GRAPH_HEIGHT}>
            <Polyline
              points={buildPolyline(g.data)}
              fill="none"
              stroke={g.color}
              strokeWidth={2}
            />
          </Svg>
        </View>
      ))}
    </View>
  );
};

/* ---------------- Styles ---------------- */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#111",
    paddingTop: 40,
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    color: "#fff",
    fontWeight: "bold",
    marginBottom: 10,
  },
  picker: {
    width: 240,
    color: "#fff",
    backgroundColor: "#222",
    marginBottom: 15,
  },
  graphBox: {
    marginBottom: 15,
    alignItems: "center",
  },
  graphTitle: {
    color: "#ccc",
    marginBottom: 4,
    fontSize: 14,
  },
  valueText: {
    color: "#fff",
    fontWeight: "bold",
  },
});

export default GraphsScreen;
