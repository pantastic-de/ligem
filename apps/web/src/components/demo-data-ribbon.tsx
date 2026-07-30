// Diagonal corner ribbon shown site-wide while LiGem is still a pre-launch
// preview running on generated demo data. Remove this component (and its
// use in layout.tsx) once real listings replace the demo dataset for good.
export function DemoDataRibbon() {
  return (
    <div className="pointer-events-none fixed inset-0 z-[9999] overflow-hidden">
      <div className="ligem-demo-ribbon">
        Vorab-Version
        <br />
        Demo-Daten
      </div>
    </div>
  );
}
