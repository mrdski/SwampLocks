"use client";

import React, { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html, Stars } from "@react-three/drei";
import * as THREE from "three";

// Interface for basic stock data
interface Stock {
  symbol: string;
  marketCap: number;
  change: number;
}

// Extended stock data with precomputed values
interface ExtendedStock extends Stock {
  normalizedCap: number;
  baseRadius: number;
}

// Compute positions in concentric rings based on market cap
function computeConcentricPositions(
  stocks: Stock[],
  baseMin: number,
  baseMax: number
): { stock: ExtendedStock; position: { x: number; z: number } }[] {
  if (stocks.length === 0) return [];

  // Sort stocks by market cap descending
  const sorted = stocks.slice().sort((a, b) => b.marketCap - a.marketCap);
  const caps = sorted.map((s) => s.marketCap);
  const minCap = Math.min(...caps);
  const maxCap = Math.max(...caps);

  // Compute a normalized cap and a base radius for each stock
  const stocksWithData: ExtendedStock[] = sorted.map((stock) => {
    const normalizedCap = maxCap !== minCap
      ? (stock.marketCap - minCap) / (maxCap - minCap)
      : 0;
    const baseRadius = baseMin + normalizedCap * (baseMax - baseMin);
    return { ...stock, normalizedCap, baseRadius };
  });

  // Divide stocks into rings: ring 0 has 1, ring n has 6*n
  const rings: ExtendedStock[][] = [];
  let idx = 0;
  let ringNum = 0;
  while (idx < stocksWithData.length) {
    const count = ringNum === 0 ? 1 : 6 * ringNum;
    rings.push(stocksWithData.slice(idx, idx + count));
    idx += count;
    ringNum++;
  }

  // Find max base radius in each ring
  const ringMax = rings.map((ring) => Math.max(...ring.map((s) => s.baseRadius), 0));

  // Compute the radius at which each ring sits
  const ringR: number[] = [0];
  for (let i = 1; i < rings.length; i++) {
    const n = rings[i].length;
    const prevR = ringR[i - 1] + ringMax[i - 1] + ringMax[i];
    const angleR = n > 1 ? ringMax[i] / Math.sin(Math.PI / n) : prevR;
    ringR[i] = Math.max(prevR, angleR);
  }

  // Assign x,z coordinates for each stock in its ring
  const positions: { stock: ExtendedStock; position: { x: number; z: number } }[] = [];
  if (rings[0].length > 0) {
    positions.push({ stock: rings[0][0], position: { x: 0, z: 0 } });
  }
  for (let i = 1; i < rings.length; i++) {
    const n = rings[i].length;
    const r = ringR[i];
    for (let j = 0; j < n; j++) {
      const theta = (2 * Math.PI * j) / n;
      positions.push({
        stock: rings[i][j],
        position: { x: r * Math.cos(theta), z: r * Math.sin(theta) }
      });
    }
  }
  return positions;
}

// Component that draws a single mountain representing one stock
interface MountainProps {
  stock: ExtendedStock;
  position: { x: number; z: number };
}

function Mountain({ stock, position }: MountainProps) {
  // Use change percent to set height, positive up, negative flipped
  const scaleFactor = 10;
  const height = Math.abs(stock.change) * scaleFactor;
  const isPositive = stock.change >= 0;
  const color = isPositive ? "#13d62a" : "#ed2424";

  // Create a cone geometry once per stock
  const geometry = useMemo(() => {
    const geo = new THREE.ConeGeometry(stock.baseRadius, height, 4);
    geo.translate(0, height / 2, 0);
    return geo;
  }, [stock.baseRadius, height]);

  return (
    <>
      {/* Mesh for the cone */}
      <mesh
        position={[position.x, 0, position.z]}
        rotation={isPositive ? [0, 0, 0] : [Math.PI, 0, 0]}
        geometry={geometry}
      >
        <meshStandardMaterial
          color={color}
          metalness={0.5}
          roughness={0.4}
          emissive={isPositive ? "#000000" : "#ff5555"}
          emissiveIntensity={0.4}
        />
      </mesh>

      {/* Label above/below the peak */}
      <Html
        position={[
          position.x,
          isPositive ? height + 5 : -height - 5,
          position.z
        ]}
      >
        <div style={{ color: "black", fontSize: "12px", textAlign: "center" }}>
          {stock.symbol} {stock.change}%
        </div>
      </Html>
    </>
  );
}

// Component that renders all mountains
interface MountainChartProps {
  stocks: Stock[];
}

function MountainChart({ stocks }: MountainChartProps) {
  const baseMin = 3;
  const baseMax = 10;

  // Compute positions for all stocks
  const positionsData = computeConcentricPositions(stocks, baseMin, baseMax);

  return (
    <>
      {positionsData.map((item, idx) => (
        <Mountain
          key={item.stock.symbol + idx}
          stock={item.stock}
          position={item.position}
        />
      ))}
    </>
  );
}

// Group that slowly rotates the scene
function RotatingGroup({ children }: { children: React.ReactNode }) {
  const groupRef = useRef<THREE.Group>(null!);
  useFrame((state, delta) => {
    groupRef.current.rotation.y += delta * 0.1;
  });
  return <group ref={groupRef}>{children}</group>;
}

// Main component that sets up the 3D canvas
interface MountainMapProps {
  stocks: Stock[];
}

const MountainMap: React.FC<MountainMapProps> = ({ stocks }) => {
  return (
    <div style={{ width: 900, height: 600, borderRadius: '60% / 60%', backgroundColor: 'transparent' }}>
      <Canvas camera={{ position: [0, 50, 100], fov: 65 }} style={{ background: 'transparent' }}>
        {/* Basic lighting and background stars */}
        <ambientLight intensity={0.3} />
        <directionalLight position={[0, 100, 50]} intensity={1} />
        <Stars radius={450} depth={50} count={5000} factor={4} saturation={0} fade />

        {/* Rotating group holds the mountains */}
        <RotatingGroup>
          <MountainChart stocks={stocks} />
        </RotatingGroup>

        {/* Controls to orbit around the scene */}
        <OrbitControls />
      </Canvas>
    </div>
  );
};

export default MountainMap;
