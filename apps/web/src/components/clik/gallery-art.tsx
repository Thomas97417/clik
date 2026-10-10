import type { ReactNode } from "react";
import BrickAvatar from "@/components/ui/brick-avatar";

const tones = {
  blue: ["#abc8ff", "#6693ec", "#416ec2"],
  peach: ["#ffdfc7", "#f0b28d", "#cc8b69"],
  mint: ["#c4e2d2", "#87bca1", "#5d947c"],
  violet: ["#e0cef8", "#b89ade", "#8d70b5"],
  white: ["#ffffff", "#e9eff9", "#bdcde5"],
} as const;

function Brick({
  x,
  y,
  width,
  height,
  depth = 7,
  tone,
  studs = 2,
  showTop = true,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  depth?: number;
  tone: keyof typeof tones;
  studs?: number;
  showTop?: boolean;
}) {
  const [top, front, side] = tones[tone];
  const rise = depth * 0.55;
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d={`M0 0h${width}v${height}H0Z`} fill={front} />
      <path
        d={`M${width} 0l${depth} ${-rise}v${height}l${-depth} ${rise}Z`}
        fill={side}
      />
      {showTop && (
        <path
          d={`M0 0l${depth} ${-rise}h${width}l${-depth} ${rise}Z`}
          fill={top}
        />
      )}
      <path
        d={`M0 .4h${width}l${depth} ${-rise}M${width} .4v${height - 0.4}`}
        stroke="#fff"
        strokeOpacity=".4"
        strokeWidth=".7"
      />
      {Array.from({ length: studs }, (_, index) => (
        <g
          key={index}
          transform={`translate(${((index + 0.5) * width) / studs + depth / 2} ${-rise / 2 - 1.6})`}
        >
          <path d="M-2.8 0v1.6a2.8 1.3 0 0 0 5.6 0V0Z" fill={side} />
          <ellipse rx="2.8" ry="1.3" fill={top} />
        </g>
      ))}
    </g>
  );
}

function Robot() {
  return (
    <g transform="translate(81 111)" strokeLinejoin="round">
      <ellipse cx="5" cy="47" rx="34" ry="5" fill="#cbded5" />
      <Brick x={-18} y={25} width={10} height={17} tone="white" studs={0} />
      <Brick x={9} y={25} width={10} height={17} tone="white" studs={0} />
      <Brick x={-24} y={39} width={19} height={7} tone="mint" studs={0} />
      <Brick x={7} y={39} width={19} height={7} tone="mint" studs={0} />
      <Brick x={-32} y={3} width={9} height={22} tone="mint" studs={1} />
      <g transform="rotate(-25 26 12)">
        <Brick x={22} y={-8} width={9} height={22} tone="mint" studs={1} />
        <Brick x={21} y={-19} width={11} height={10} tone="white" studs={1} />
      </g>
      <Brick x={-19} y={-2} width={38} height={28} tone="mint" studs={0} />
      <rect x="-11" y="7" width="23" height="11" rx="2" fill="#d7ecdf" />
      <circle cx="-5" cy="12.5" r="2" fill="#5d947c" />
      <path
        d="M2 12.5h5"
        stroke="#87bca1"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <Brick x={-5} y={-10} width={11} height={8} tone="white" studs={0} />
      <Brick x={-22} y={-34} width={43} height={25} tone="mint" studs={3} />
      <rect x="-16" y="-28" width="32" height="13" rx="3" fill="#eaf6ee" />
      <rect x="-11" y="-24" width="5" height="5" rx="1.5" fill="#477564" />
      <rect x="6" y="-24" width="5" height="5" rx="1.5" fill="#477564" />
      <path
        d="M-3-17h7M1-39v-9"
        stroke="#5d947c"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <Brick
        x={-3}
        y={-51}
        width={8}
        height={5}
        tone="peach"
        depth={4}
        studs={1}
      />
    </g>
  );
}

function Rocket() {
  return (
    <g transform="translate(340 99)" strokeLinejoin="round">
      <ellipse cx="5" cy="47" rx="32" ry="5" fill="#ddd4eb" />
      <path d="M-5 27 0 45l7-5 4-15Z" fill="#f5c8a1" />
      <path d="m0 27 3 11 4-12Z" fill="#fff0db" />
      <path d="m-12 1-16 20v13l16-7Z" fill="#b89ade" />
      <path d="m-12 1 6-4-16 20-6 4Z" fill="#e0cef8" />
      <Brick x={-10} y={19} width={20} height={7} tone="peach" studs={0} />
      <Brick x={-13} y={-24} width={26} height={15} tone="white" studs={0} />
      <Brick x={-13} y={-9} width={26} height={15} tone="white" studs={0} />
      <Brick x={-13} y={6} width={26} height={14} tone="violet" studs={0} />
      <path d="m13 0 15 20v13l-15-6Z" fill="#b89ade" />
      <path d="m13 0 7-4 15 20-7 4Z" fill="#e0cef8" />
      <path d="m28 20 7-4v13l-7 4Z" fill="#8d70b5" />
      <Brick x={-13} y={-30} width={26} height={6} tone="peach" studs={0} />
      <Brick x={-9} y={-41} width={18} height={11} tone="peach" studs={0} />
      <Brick x={-5} y={-50} width={10} height={9} tone="peach" studs={1} />
      <circle cy="-11" r="8" fill="#abc8ff" stroke="#bdcde5" strokeWidth="3" />
      <path
        d="m-3-13 5-3"
        stroke="#e9f2ff"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="m-31-29 2 4 4 2-4 2-2 4-2-4-4-2 4-2Z" fill="#d1b9ed" />
      <circle cx="36" cy="-39" r="2" fill="#f0b28d" />
    </g>
  );
}

function House() {
  return (
    <g transform="translate(196 145)" strokeLinejoin="round">
      <ellipse cx="11" cy="47" rx="66" ry="7" fill="#d4dfef" />
      <Brick
        x={-48}
        y={39}
        width={108}
        height={5}
        tone="white"
        depth={12}
        studs={0}
      />
      <Brick
        x={46}
        y={15}
        width={7}
        height={24}
        tone="peach"
        depth={4}
        studs={0}
      />
      <Brick
        x={39}
        y={3}
        width={21}
        height={13}
        tone="mint"
        depth={7}
        studs={2}
      />
      <Brick
        x={43}
        y={-8}
        width={13}
        height={11}
        tone="mint"
        depth={7}
        studs={1}
      />
      <Brick
        x={-35}
        y={5}
        width={31}
        height={16}
        tone="blue"
        depth={12}
        studs={0}
      />
      <Brick
        x={-4}
        y={5}
        width={31}
        height={16}
        tone="blue"
        depth={12}
        studs={0}
      />
      <Brick
        x={-35}
        y={21}
        width={62}
        height={18}
        tone="blue"
        depth={12}
        studs={0}
        showTop={false}
      />
      <Brick
        x={23}
        y={-27}
        width={10}
        height={27}
        tone="blue"
        depth={8}
        studs={1}
      />
      <Brick
        x={-43}
        y={-5}
        width={78}
        height={10}
        tone="peach"
        depth={12}
        studs={0}
      />
      <Brick
        x={-30}
        y={-16}
        width={52}
        height={11}
        tone="peach"
        depth={12}
        studs={0}
      />
      <Brick
        x={-17}
        y={-27}
        width={26}
        height={11}
        tone="peach"
        depth={12}
        studs={2}
      />
      <path d="M-6 39V25a7 7 0 0 1 14 0v14Z" fill="#e8f0ff" />
      <path
        d="M5 30v3"
        stroke="#6693ec"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      {[-27, 13].map((x) => (
        <g key={x} transform={`translate(${x} 12)`}>
          <rect width="12" height="13" rx="1" fill="#e8f0ff" />
          <path d="M6 0v13M0 6.5h12" stroke="#93b4f1" />
          <path
            d="M-2 14h16"
            stroke="#416ec2"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </g>
      ))}
      <Brick
        x={-44}
        y={32}
        width={8}
        height={7}
        tone="mint"
        depth={5}
        studs={1}
      />
    </g>
  );
}

function CreationCard({
  x,
  y,
  width,
  height,
  rotate,
  tint,
  seed,
  number,
  children,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
  rotate: number;
  tint: string;
  seed: string;
  number: string;
  children: ReactNode;
}) {
  const bottom = y + height;
  const previewHeight = height - 49;
  return (
    <g transform={`rotate(${rotate} ${x + width / 2} ${y + height / 2})`}>
      <rect
        x={x + 1}
        y={y + 6}
        width={width}
        height={height}
        rx="12"
        fill="#d7e1ef"
        opacity=".5"
      />
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx="12"
        fill="#fff"
        stroke="#dbe4f0"
      />
      <rect
        x={x + 7}
        y={y + 7}
        width={width - 14}
        height={previewHeight}
        rx="7"
        fill={tint}
      />
      <path
        d={`M${x + 23} ${y + 20}v${previewHeight - 26}M${x + width - 23} ${y + 20}v${previewHeight - 26}M${x + 18} ${y + previewHeight - 10}h${width - 36}`}
        stroke="#9ab0cf"
        strokeOpacity=".25"
        strokeDasharray="2 4"
      />
      <text
        x={x + 16}
        y={y + 24}
        fill="#8b9cb5"
        fontSize="8"
        fontFamily="monospace"
        letterSpacing="1"
      >
        {number}
      </text>
      {children}
      <g transform={`translate(${x + 12} ${bottom - 31})`}>
        <BrickAvatar avatar={{ version: 1, seed }} size={24} />
      </g>
      <path
        d={`M${x + 44} ${bottom - 22}h${width * 0.35}`}
        stroke="#a7b8ce"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path
        d={`M${x + 44} ${bottom - 14}h${width * 0.22}`}
        stroke="#dbe4f0"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </g>
  );
}

/** Three different creations, each signed by a different brick avatar. */
export default function GalleryArt() {
  return (
    <svg
      className="gallery-art block w-full max-w-105 self-center justify-self-end max-sm:hidden"
      viewBox="0 0 420 260"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M80 54c29-34 108-46 170-31s118 67 111 126-84 89-169 81S65 192 55 142s-4-66 25-88Z"
        fill="#edf2fa"
      />
      <g stroke="#c6d6ed" strokeLinecap="round">
        <path
          d="M94 26v211M309 18v213M36 114h354M65 216h281"
          strokeDasharray="3 7"
          strokeOpacity=".65"
        />
        <path d="M90 26h8M90 237h8M305 18h8M305 231h8M36 110v8M390 110v8" />
        <path d="M164 36c24-10 73-10 97 3" strokeDasharray="2 5" />
      </g>
      <CreationCard
        x={22}
        y={41}
        width={124}
        height={163}
        rotate={-9}
        tint="#eef6f1"
        seed="gallery-maker-robot"
        number="01"
      >
        <Robot />
      </CreationCard>
      <CreationCard
        x={279}
        y={30}
        width={124}
        height={163}
        rotate={9}
        tint="#f3eff9"
        seed="gallery-maker-rocket"
        number="03"
      >
        <Rocket />
      </CreationCard>
      <CreationCard
        x={122}
        y={78}
        width={158}
        height={163}
        rotate={-3}
        tint="#edf3fd"
        seed="gallery-maker-house"
        number="02"
      >
        <House />
      </CreationCard>
      <path
        d="m180 21 2.5 6 6 2.5-6 2.5-2.5 6-2.5-6-6-2.5 6-2.5Z"
        fill="#9ab9ee"
      />
      <path
        d="M30 226v8m-4-4h8"
        stroke="#9db8a9"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="370" cy="222" r="4" fill="#f0c5a6" />
      <circle cx="255" cy="16" r="2.5" fill="#c9b7e1" />
    </svg>
  );
}
