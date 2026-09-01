const snacks = [
  { src: "martys-cracklin", top: "7%", left: "5%", rotate: -18, width: 78, delay: "0s", duration: "6.4s" },
  { src: "cheese-ring", top: "5%", left: "32%", rotate: 14, width: 72, delay: "0.6s", duration: "7.1s" },
  { src: "chikn-skin", top: "8%", left: "58%", rotate: -8, width: 76, delay: "1.1s", duration: "6.8s" },
  { src: "chiz-curls", top: "4%", left: "80%", rotate: 16, width: 80, delay: "0.3s", duration: "7.6s" },
  { src: "tempura", top: "22%", left: "86%", rotate: -14, width: 74, delay: "1.8s", duration: "6.2s" },
  { src: "boy-bawang", top: "24%", left: "3%", rotate: 10, width: 82, delay: "0.9s", duration: "7.4s" },
  { src: "nagaraya", top: "28%", left: "28%", rotate: -12, width: 70, delay: "1.4s", duration: "6.9s" },
  { src: "ding-dong", top: "26%", left: "52%", rotate: 8, width: 76, delay: "0.2s", duration: "7.8s" },
  { src: "tortillos", top: "38%", left: "74%", rotate: -20, width: 80, delay: "2.1s", duration: "6.5s" },
  { src: "bread-pan", top: "42%", left: "8%", rotate: 18, width: 72, delay: "1.6s", duration: "7.2s" },
  { src: "roller-coaster", top: "46%", left: "36%", rotate: -6, width: 78, delay: "0.5s", duration: "6.7s" },
  { src: "mr-chips", top: "44%", left: "58%", rotate: 12, width: 74, delay: "2.4s", duration: "7.9s" },
  { src: "potato-chips", top: "58%", left: "82%", rotate: -10, width: 76, delay: "0.8s", duration: "6.3s" },
  { src: "vcut", top: "60%", left: "4%", rotate: 15, width: 80, delay: "1.9s", duration: "7.0s" },
  { src: "crispy-patata", top: "62%", left: "28%", rotate: -16, width: 70, delay: "0.4s", duration: "6.6s" },
  { src: "nova", top: "60%", left: "52%", rotate: 9, width: 78, delay: "2.2s", duration: "7.5s" },
  { src: "clover-chips", top: "74%", left: "70%", rotate: -12, width: 74, delay: "1.3s", duration: "6.1s" },
  { src: "piattos", top: "76%", left: "16%", rotate: 11, width: 82, delay: "0.7s", duration: "7.3s" },
  { src: "kirei", top: "78%", left: "42%", rotate: -18, width: 72, delay: "2.6s", duration: "6.8s" },
  { src: "potato-fries", top: "72%", left: "88%", rotate: 20, width: 68, delay: "1.0s", duration: "7.7s" },
  { src: "cracklings", top: "88%", left: "2%", rotate: -8, width: 76, delay: "1.7s", duration: "6.4s" },
  { src: "knick-knacks", top: "88%", left: "26%", rotate: 14, width: 74, delay: "0.1s", duration: "7.1s" },
  { src: "sponge-crunch", top: "87%", left: "50%", rotate: -11, width: 78, delay: "2.0s", duration: "6.9s" },
  { src: "pillows", top: "86%", left: "74%", rotate: 7, width: 76, delay: "1.5s", duration: "7.4s" },
  { src: "prawn-crackers", top: "18%", left: "70%", rotate: -15, width: 72, delay: "2.3s", duration: "6.6s" },
] as const;

export function FloatingSnacks({ compact = false }: { compact?: boolean }) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {snacks.map((snack) => {
        const top = Number.parseFloat(snack.top);
        const left = Number.parseFloat(snack.left);
        const coversForm = compact && top > 16 && top < 78 && left > 12 && left < 72;
        if (coversForm) return null;
        return (
          <img
            key={snack.src}
            src={`/snacks/${snack.src}.png`}
            alt=""
            className="absolute origin-center select-none opacity-70 drop-shadow-[0_14px_18px_rgba(0,0,0,0.38)]"
            style={{
              top: snack.top,
              left: snack.left,
              width: compact ? Math.round(snack.width * 0.62) : snack.width,
              animation: `snack-float ${snack.duration} ease-in-out ${snack.delay} infinite`,
              ["--snack-rotate" as string]: `${snack.rotate}deg`,
            }}
          />
        );
      })}
    </div>
  );
}
