import {
  AVATAR_PART_HEIGHT,
  AVATAR_ARCH_PROFILE,
  type AvatarPart,
} from "@clik/avatars";

const STUD = 10.8;
export const PLATE = 4.32;
const DEPTH_X = 3;
export const DEPTH_Y = 3.2;
const ORIGIN_X = (100 - 6 * STUD - DEPTH_X) / 2;
const CURVE = 0.5522847498;

function AvatarStuds({
  x,
  top,
  studs,
  depth = 1,
}: {
  x: number;
  top: number;
  studs: number[];
  depth?: number;
}) {
  return (
    <>
      {studs.map((index) => (
        <g
          key={index}
          transform={`translate(${x + (index + 0.5) * STUD + (DEPTH_X * depth) / 2} ${top - (DEPTH_Y * depth) / 2 - 1.8})`}
        >
          <path d="M-2.6 0v1.8a2.6 1.1 0 0 0 5.2 0V0Z" />
          <path
            d="M-2.6 0v1.8a2.6 1.1 0 0 0 5.2 0V0Z"
            fill="#142747"
            opacity=".14"
          />
          <ellipse rx="2.6" ry="1.1" />
          <ellipse rx="2.6" ry="1.1" fill="#fff" opacity=".4" />
        </g>
      ))}
    </>
  );
}

function RoundedPiece({
  x,
  width,
  bottom,
  height,
  color,
  dome,
}: {
  x: number;
  width: number;
  bottom: number;
  height: number;
  color: string;
  dome: boolean;
}) {
  const center = x + width / 2 + DEPTH_X / 2;
  const left = x + DEPTH_X / 2;
  const right = left + width;
  const foot = bottom - DEPTH_Y / 2;
  const top = foot - height;
  const roof = dome
    ? `M${left} ${foot}C${left} ${foot - height * CURVE} ${center - (width * CURVE) / 2} ${top} ${center} ${top}C${center + (width * CURVE) / 2} ${top} ${right} ${foot - height * CURVE} ${right} ${foot}`
    : `M${center} ${top}L${right} ${foot}`;
  const front = `${roof}A${width / 2} ${DEPTH_Y / 2} 0 0 1 ${left} ${foot}Z`;
  const shade = `M${center} ${top}${dome ? `C${center + (width * CURVE) / 2} ${top} ${right} ${foot - height * CURVE} ${right} ${foot}` : `L${right} ${foot}`}A${width / 2} ${DEPTH_Y / 2} 0 0 1 ${center} ${bottom}Z`;
  return (
    <g fill={color} data-avatar-part={dome ? "dome" : "cone"}>
      <path d={front} />
      <path d={shade} fill="#142747" opacity=".16" />
      <path
        d={
          dome
            ? `M${left + 1.2} ${foot - 1.5}C${left + 1.2} ${foot - height * CURVE} ${center - (width * CURVE) / 2} ${top + 1} ${center} ${top + 1}`
            : `M${left + 1} ${foot - 1}L${center} ${top + 1}`
        }
        fill="none"
        stroke="#fff"
        strokeOpacity=".4"
        strokeWidth=".65"
      />
      <path
        d={`M${right} ${foot}A${width / 2} ${DEPTH_Y / 2} 0 0 1 ${left} ${foot}`}
        fill="none"
        stroke="#142747"
        strokeOpacity=".18"
        strokeWidth=".65"
      />
    </g>
  );
}

function QuarterPiece({
  part,
  x,
  width,
  bottom,
  studs,
}: {
  part: Extract<AvatarPart, { kind: "quarter-plate" | "quarter-tile" }>;
  x: number;
  width: number;
  bottom: number;
  studs: number[];
}) {
  const top = bottom - PLATE;
  const curve = (y: number, reverse = false) => {
    const points =
      part.side === 1
        ? [
            [x + width, y],
            [x + width + CURVE * DEPTH_X, y - CURVE * DEPTH_Y],
            [x + DEPTH_X + CURVE * width, y - DEPTH_Y],
            [x + DEPTH_X, y - DEPTH_Y],
          ]
        : [
            [x, y],
            [x + CURVE * DEPTH_X, y - CURVE * DEPTH_Y],
            [x + width + DEPTH_X - CURVE * width, y - DEPTH_Y],
            [x + width + DEPTH_X, y - DEPTH_Y],
          ];
    if (reverse) points.reverse();
    return {
      start: points[0].join(" "),
      end: points[3].join(" "),
      path: `C${points[1].join(" ")} ${points[2].join(" ")} ${points[3].join(" ")}`,
    };
  };
  const upper = curve(top),
    lower = curve(bottom, true);
  const side = `M${upper.start}${upper.path}L${lower.start}${lower.path}Z`;
  const roof =
    part.side === 1
      ? `M${x} ${top}H${x + width}${upper.path}Z`
      : `M${upper.start}${upper.path}L${x + width} ${top}Z`;
  return (
    <g fill={part.color} data-avatar-part={part.kind}>
      <path d={side} />
      <path d={side} fill="#142747" opacity=".2" />
      <path d={`M${x} ${top}H${x + width}V${bottom}H${x}Z`} />
      <path d={roof} />
      <path d={roof} fill="#fff" opacity=".28" />
      <path
        d={`M${x + 0.4} ${bottom - 0.4}H${x + width - 0.4}`}
        fill="none"
        stroke="#142747"
        strokeOpacity=".18"
        strokeWidth=".65"
      />
      <AvatarStuds x={x} top={top} studs={studs} depth={1 / part.width} />
    </g>
  );
}

export default function AvatarPiece({
  part,
  studs,
  base,
}: {
  part: AvatarPart;
  studs: number[];
  base: number;
}) {
  const x = ORIGIN_X + part.x * STUD;
  const width = part.width * STUD;
  const bottom = base - part.y * PLATE;
  const height = AVATAR_PART_HEIGHT[part.kind] * PLATE;
  if (part.kind === "cone" || part.kind === "dome")
    return (
      <RoundedPiece
        x={x}
        width={width}
        bottom={bottom}
        height={height}
        color={part.color}
        dome={part.kind === "dome"}
      />
    );
  if (part.kind === "quarter-plate" || part.kind === "quarter-tile")
    return (
      <QuarterPiece
        part={part}
        x={x}
        width={width}
        bottom={bottom}
        studs={studs}
      />
    );
  const sloped = part.kind === "slope" || part.kind === "curved-slope";
  const left = bottom - (sloped && part.rise === 1 ? PLATE : height);
  const right = bottom - (sloped && part.rise === -1 ? PLATE : height);
  let topFace = `M${x} ${left}L${x + width} ${right}l${DEPTH_X} ${-DEPTH_Y}L${x + DEPTH_X} ${left - DEPTH_Y}Z`;
  let rightFoot = bottom;
  const opening =
    part.kind === "arch"
      ? {
          left: x + AVATAR_ARCH_PROFILE.legWidth * STUD,
          right: x + width - AVATAR_ARCH_PROFILE.legWidth * STUD,
          spring: bottom - AVATAR_ARCH_PROFILE.springHeight * PLATE,
          rx: (width - 2 * AVATAR_ARCH_PROFILE.legWidth * STUD) / 2,
          ry: AVATAR_ARCH_PROFILE.rise * PLATE,
        }
      : null;
  const archCurve = (fromLeft: boolean, dx = 0, dy = 0) => {
    if (!opening) return "";
    const start = (fromLeft ? opening.left : opening.right) + dx;
    const end = (fromLeft ? opening.right : opening.left) + dx;
    const spring = opening.spring + dy;
    if (part.kind === "arch" && part.opening === "pointed") {
      const middle = (start + end) / 2;
      return `Q${start} ${spring - opening.ry / 2} ${middle} ${spring - opening.ry}Q${end} ${spring - opening.ry / 2} ${end} ${spring}`;
    }
    return `A${opening.rx} ${opening.ry} 0 0 ${fromLeft ? 1 : 0} ${end} ${spring}`;
  };
  let frontFace = opening
    ? `M${x} ${left}H${x + width}V${bottom}H${opening.right}V${opening.spring}${archCurve(false)}V${bottom}H${x}Z`
    : `M${x} ${left}L${x + width} ${right}V${bottom}H${x}Z`;
  const innerFace = opening
    ? `M${opening.left} ${bottom}V${opening.spring}${archCurve(true)}l${DEPTH_X} ${-DEPTH_Y}${archCurve(false, DEPTH_X, -DEPTH_Y)}V${bottom - DEPTH_Y}Z`
    : undefined;
  let bottomEdge = opening
    ? `M${x + 0.4} ${bottom - 0.4}H${opening.left - 0.4}M${opening.right + 0.4} ${bottom - 0.4}H${x + width - 0.4}`
    : `M${x + 0.4} ${bottom - 0.4}H${x + width - 0.4}`;
  let highlight = `M${x + 0.4} ${left + 0.3}L${x + width - 0.4} ${right + 0.3}`;
  if (part.kind === "curved-slope") {
    const controls =
      part.rise === 1
        ? [
            [x, left - (height - PLATE) * CURVE],
            [x + width - width * CURVE, right],
          ]
        : [
            [x + width * CURVE, left],
            [x + width, right - (height - PLATE) * CURVE],
          ];
    const curve = (reverse = false, dx = 0, dy = 0) => {
      const points = reverse ? [...controls].reverse() : controls;
      const end = reverse ? [x, left] : [x + width, right];
      return `C${points.map(([px, py]) => `${px + dx} ${py + dy}`).join(" ")} ${end[0] + dx} ${end[1] + dy}`;
    };
    frontFace = `M${x} ${left}${curve()}V${bottom}H${x}Z`;
    topFace = `M${x} ${left}${curve()}l${DEPTH_X} ${-DEPTH_Y}${curve(true, DEPTH_X, -DEPTH_Y)}Z`;
    highlight = `M${x} ${left + 0.3}${curve(false, 0, 0.3)}`;
  } else if (part.kind === "inverted-slope") {
    const raised = bottom - height + PLATE;
    if (part.rise === 1) {
      const heel = x + width - STUD;
      frontFace = `M${x} ${left}H${x + width}V${bottom}H${heel}L${x} ${raised}Z`;
      bottomEdge = `M${x + 0.4} ${raised - 0.4}L${heel} ${bottom - 0.4}H${x + width - 0.4}`;
    } else {
      const heel = x + STUD;
      rightFoot = raised;
      frontFace = `M${x} ${left}H${x + width}V${raised}L${heel} ${bottom}H${x}Z`;
      bottomEdge = `M${x + 0.4} ${bottom - 0.4}H${heel}L${x + width - 0.4} ${raised - 0.4}`;
    }
  }
  const sideFace = `M${x + width} ${right}l${DEPTH_X} ${-DEPTH_Y}V${rightFoot - DEPTH_Y}l${-DEPTH_X} ${DEPTH_Y}Z`;
  return (
    <g fill={part.color} data-avatar-part={part.kind}>
      <path d={sideFace} />
      <path d={sideFace} fill="#142747" opacity=".2" />
      {innerFace && (
        <>
          <path d={innerFace} />
          <path d={innerFace} fill="#142747" opacity=".24" />
        </>
      )}
      <path d={frontFace} />
      <path d={topFace} />
      <path d={topFace} fill="#fff" opacity=".28" />
      {part.kind === "masonry" && (
        <g fill="none" stroke="#142747" strokeOpacity=".24" strokeWidth=".6">
          {[1, 2].map((row) => (
            <path
              key={row}
              d={`M${x + 0.4} ${bottom - row * PLATE}H${x + width - 0.4}`}
            />
          ))}
          {[0, 1, 2].map((row) =>
            Array.from({ length: part.width }, (_, i) => i)
              .filter((i) => i > 0 && i % 2 === row % 2)
              .map((i) => (
                <path
                  key={`${row}-${i}`}
                  d={`M${x + i * STUD} ${bottom - row * PLATE - 0.3}v${-PLATE + 0.6}`}
                />
              )),
          )}
        </g>
      )}
      {part.kind === "grille" && (
        <g fill="none" stroke="#142747" strokeOpacity=".25" strokeWidth=".65">
          {Array.from({ length: part.width * 3 - 1 }, (_, i) => (
            <path
              key={i}
              d={`M${x + ((i + 1) * STUD) / 3} ${left + 0.8}V${bottom - 0.8}`}
            />
          ))}
          {[1, 2].map((i) => (
            <path
              key={`top-${i}`}
              d={`M${x + (DEPTH_X * i) / 3 + 0.5} ${left - (DEPTH_Y * i) / 3}h${width - 1}`}
            />
          ))}
        </g>
      )}
      <path
        d={`M${x + width - 0.3} ${right + 0.5}V${rightFoot - 0.5}`}
        fill="none"
        stroke="#142747"
        strokeOpacity=".16"
        strokeWidth=".55"
      />
      <path
        d={bottomEdge}
        fill="none"
        stroke="#142747"
        strokeOpacity=".18"
        strokeWidth=".65"
      />
      <path
        d={highlight}
        fill="none"
        stroke="#fff"
        strokeOpacity=".42"
        strokeWidth=".55"
      />
      <AvatarStuds x={x} top={left} studs={studs} />
    </g>
  );
}
