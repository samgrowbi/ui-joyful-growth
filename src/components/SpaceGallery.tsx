// Images intentionally interleaved so similar types don't appear together
const images = [
  "https://pub-eb17aaa123fc4145b1ee4c15fc2e5771.r2.dev/Med%20Spa/Gallery/66eaf458790217deeca9107d_DSCF0150-min-p-2000.jpg",
  "https://pub-eb17aaa123fc4145b1ee4c15fc2e5771.r2.dev/Med%20Spa/Gallery/66eaf46d82c0f5de621a9dc3_DSCF0117-min-p-2000.jpg",
  "https://pub-eb17aaa123fc4145b1ee4c15fc2e5771.r2.dev/Med%20Spa/Gallery/66eaf475ada431ad4d7113df_DSCF0119-min-p-2000.jpg",
  "https://pub-eb17aaa123fc4145b1ee4c15fc2e5771.r2.dev/Med%20Spa/Gallery/66eaf4855e7b0a2e9ad0bd10_DSCF0128-min-p-2000.jpg",
  "https://pub-eb17aaa123fc4145b1ee4c15fc2e5771.r2.dev/Med%20Spa/Gallery/66eaf48724bbbae328f957c0_DSCF0129-min-p-2000.jpg",
  "https://pub-eb17aaa123fc4145b1ee4c15fc2e5771.r2.dev/Med%20Spa/Gallery/66eaf48e87f4a89aebdb0d39_DSCF0175-min-p-2000.jpg",
  "https://pub-eb17aaa123fc4145b1ee4c15fc2e5771.r2.dev/Med%20Spa/Gallery/66eaf49718e355ddf5377bc0_DSCF0193-min-p-2000.jpg",
  "https://pub-eb17aaa123fc4145b1ee4c15fc2e5771.r2.dev/Med%20Spa/Gallery/66eaf4abeb0abf2ab6734501_DSCF0299-min-p-2000.jpg",
  "https://pub-eb17aaa123fc4145b1ee4c15fc2e5771.r2.dev/Med%20Spa/Gallery/6730e49b91a5402c4230e440_DSCF0253-min-p-2000.jpg",
  "https://pub-eb17aaa123fc4145b1ee4c15fc2e5771.r2.dev/Med%20Spa/Gallery/66eaf45b4e5c94b166dd65be_DSCF0146-min-p-2000.jpg",
  "https://pub-eb17aaa123fc4145b1ee4c15fc2e5771.r2.dev/Med%20Spa/Gallery/66eaf46d8fb07855e5116b31_DSCF0118-min-p-2000.jpg",
  "https://pub-eb17aaa123fc4145b1ee4c15fc2e5771.r2.dev/Med%20Spa/Gallery/6730e4a33e6a506dbec8c1ac_DSCF0258-min-p-2000.jpg",
  "https://pub-eb17aaa123fc4145b1ee4c15fc2e5771.r2.dev/Med%20Spa/Gallery/6730e4ababc6ce464269081c_DSCF0220-min-p-2000.jpg",
];

export function SpaceGallery() {
  const topRow = images;
  const bottomRow = [...images].reverse();
  return (
    <section className="py-8 md:py-16 overflow-hidden bg-white" dir="ltr">
      <div className="text-center mb-8 md:mb-12 px-4">
        <h2 className="text-3xl md:text-5xl lg:text-6xl font-serif text-foreground">
          A Space Designed for{" "}
          <span className="text-primary">You</span>
        </h2>
      </div>
      <div className="flex flex-col gap-3 md:gap-4">
        {/* Top row — scrolls right */}
        <div className="relative">
          <div className="flex gap-3 md:gap-4 animate-scroll-right w-max">
            {[...topRow, ...topRow].map((src, i) => (
              <img
                key={`top-${i}`}
                src={src}
                alt="Garden Retreat med spa interior"
                loading="lazy"
                decoding="async"
                className="h-40 md:h-64 lg:h-72 w-auto rounded-xl object-cover flex-shrink-0"
              />
            ))}
          </div>
        </div>

        {/* Bottom row — scrolls left */}
        <div className="relative">
          <div className="flex gap-3 md:gap-4 animate-scroll-left w-max">
            {[...bottomRow, ...bottomRow].map((src, i) => (
              <img
                key={`bot-${i}`}
                src={src}
                alt="Garden Retreat med spa interior"
                loading="lazy"
                decoding="async"
                className="h-40 md:h-64 lg:h-72 w-auto rounded-xl object-cover flex-shrink-0"
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
