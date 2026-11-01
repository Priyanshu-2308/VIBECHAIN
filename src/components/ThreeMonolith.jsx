import React, { useEffect, useRef } from "react";
import * as THREE from "three";

export default function ThreeMonolith({ variant = "01", height = "h-44", color = 0x141414 }) {
  const mountRef = useRef(null);

  useEffect(() => {
    const currentMount = mountRef.current;
    if (!currentMount) return;

    const width = currentMount.clientWidth || 300;
    const height = currentMount.clientHeight || 176;

    // Scene
    const scene = new THREE.Scene();

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 4.2;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    currentMount.appendChild(renderer.domElement);

    // Geometry & Wireframe
    let geometry;
    if (variant === "01") {
      geometry = new THREE.OctahedronGeometry(1.3, 0);
    } else if (variant === "03") {
      geometry = new THREE.DodecahedronGeometry(1.2, 0);
    } else {
      geometry = new THREE.BoxGeometry(1.4, 1.4, 1.4);
    }

    // Wireframe edges
    const wireframeGeometry = new THREE.WireframeGeometry(geometry);
    const lineMaterial = new THREE.LineBasicMaterial({
      color: color,
      linewidth: 2,
    });
    const wireframe = new THREE.LineSegments(wireframeGeometry, lineMaterial);
    scene.add(wireframe);

    // Inner glowing core
    const innerGeo = new THREE.SphereGeometry(0.3, 8, 8);
    const innerMat = new THREE.MeshBasicMaterial({
      color: 0xff4d1c,
      wireframe: true,
    });
    const innerSphere = new THREE.Mesh(innerGeo, innerMat);
    scene.add(innerSphere);

    // Animation loop
    let animationFrameId;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      wireframe.rotation.x = elapsedTime * 0.35;
      wireframe.rotation.y = elapsedTime * 0.45;
      wireframe.rotation.z = Math.sin(elapsedTime * 0.2) * 0.2;

      innerSphere.rotation.x = -elapsedTime * 0.6;
      innerSphere.rotation.y = -elapsedTime * 0.8;

      renderer.render(scene, camera);
    };

    animate();

    // Resize listener
    const handleResize = () => {
      if (!currentMount) return;
      const newWidth = currentMount.clientWidth;
      const newHeight = currentMount.clientHeight;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      if (currentMount && renderer.domElement) {
        currentMount.removeChild(renderer.domElement);
      }
      geometry.dispose();
      wireframeGeometry.dispose();
      lineMaterial.dispose();
      innerGeo.dispose();
      innerMat.dispose();
      renderer.dispose();
    };
  }, [variant, color]);

  return (
    <div className={`w-full ${height} bg-surface-container relative flex flex-col items-center justify-center border border-surface-variant select-none overflow-hidden group`}>
      {/* HUD Telemetry Coordinates from Stitch Design System */}
      <div className="absolute top-2 left-2 font-mono text-[10px] text-tertiary tracking-wider pointer-events-none">
        SYS.GEO [X:0.00 Y:1.00 Z:0.00]
      </div>
      <div className="absolute top-2 right-2 font-mono text-[10px] text-tertiary tracking-wider pointer-events-none">
        MONO_WIRE_{variant}
      </div>
      <div className="absolute bottom-2 left-2 font-mono text-[10px] text-tertiary tracking-wider pointer-events-none">
        HASH: 0x4f...99bc
      </div>
      <div className="absolute bottom-2 right-2 font-mono text-[10px] text-tertiary tracking-wider pointer-events-none">
        CADENCE: 12.0s
      </div>

      <div ref={mountRef} className="w-full h-full flex items-center justify-center" />

      <div className="absolute bottom-1 px-2 py-0.5 bg-surface border border-surface-variant text-ink font-mono text-[10px] uppercase tracking-widest text-center pointer-events-none">
        THREE.JS MONOLITH {variant}
      </div>
    </div>
  );
}

