
const COLORS = {
  INST: "#1565C0",
  PH:   "#6A0DAD",
  LD:   "#C84B00",
  IC:   "#2E7D32",
  DEAN: "#B71C1C",
};

function Actor({ cx, cy, label, color }) {
  const lines = Array.isArray(label) ? label : [label];
  return (
    <g>
      <circle cx={cx} cy={cy} r={11} fill="white" stroke={color} strokeWidth="1.5" />
      <line x1={cx}    y1={cy+11} x2={cx}    y2={cy+36} stroke={color} strokeWidth="1.5" />
      <line x1={cx-17} y1={cy+22} x2={cx+17} y2={cy+22} stroke={color} strokeWidth="1.5" />
      <line x1={cx}    y1={cy+36} x2={cx-13} y2={cy+56} stroke={color} strokeWidth="1.5" />
      <line x1={cx}    y1={cy+36} x2={cx+13} y2={cy+56} stroke={color} strokeWidth="1.5" />
      {lines.map((ln, i) => (
        <text key={i} x={cx} y={cy + 72 + i * 14}
          textAnchor="middle" fontSize="11"
          fontFamily="Arial, sans-serif" fontWeight="bold" fill="#111">
          {ln}
        </text>
      ))}
    </g>
  );
}

function UCEllipse({ cx, cy, rx, ry, label }) {
  const lines = Array.isArray(label) ? label : [label];
  const lh = 14;
  const totalH = (lines.length - 1) * lh;
  return (
    <g>
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry}
        fill="white" stroke="black" strokeWidth="1" />
      {lines.map((ln, i) => (
        <text key={i} x={cx} y={cy - totalH / 2 + i * lh + 4.5}
          textAnchor="middle" fontSize="10.5" fontFamily="Arial, sans-serif">
          {ln}
        </text>
      ))}
    </g>
  );
}

export default function LearningPlanCompositionDiagram() {
  const W = 1200, H = 1270;
  const BX = 210, BY = 68, BW = 960, BH = 1083;

  // ── Use-case definitions ─────────────────────────────────────────
  const UCS = {
    UC1:  { cx:460, cy:158,  rx:113, ry:27, label:["Select Course","for Composition"] },
    UC2:  { cx:460, cy:275,  rx:99,  ry:27, label:["Manage ILO","Mapping"] },
    UC3:  { cx:460, cy:398,  rx:92,  ry:27, label:["Assign Topics"] },
    UC3e: { cx:790, cy:398,  rx:101, ry:27, label:["Create a new","Topic Record"] },
    UC4:  { cx:460, cy:523,  rx:100, ry:27, label:["Create and","Assign TLAs"] },
    UC4e: { cx:790, cy:523,  rx:115, ry:27, label:["Create and Assign","Assessments"] },
    UC5:  { cx:460, cy:648,  rx:93,  ry:27, label:["Assign","References"] },
    UC5e: { cx:790, cy:648,  rx:113, ry:27, label:["Create a new","Reference Record"] },
    UC6:  { cx:460, cy:753,  rx:135, ry:27, label:["Preview Learning Plan","in Institutional Format"] },
    UC7:  { cx:460, cy:848,  rx:125, ry:27, label:["Submit Learning Plan","for Approval"] },
    UC8:  { cx:460, cy:938,  rx:122, ry:27, label:["Review and Return","Learning Plan"] },
    UC9:  { cx:460, cy:1028, rx:122, ry:27, label:["Amend and Resubmit","Learning Plan"] },
    UC10: { cx:460, cy:1115, rx:116, ry:27, label:["Export Approved","Learning Plan"] },
  };

  // ── Actor definitions ─────────────────────────────────────────────
  // FX  = the x-coordinate of the elbow bend column for each actor (staggered)
  // yo  = optional y-offset for the UC connection point (used where multiple
  //        actors connect to the same UC so the lines fan out and stay distinct)
  // dash  = render branch as a dashed line (data source stereotype)
  // lbl   = stereotype label shown above the branch
  const ACTORS = [
    {
      id:"INST", cx:80, cy:400, color:COLORS.INST, label:["INSTRUCTOR"], FX:148,
      connects:[
        {uc:"UC1"}, {uc:"UC2"}, {uc:"UC3"}, {uc:"UC4"}, {uc:"UC5"},
        {uc:"UC6"}, {uc:"UC7"}, {uc:"UC9"}, {uc:"UC10"},
      ],
    },
    {
      id:"PH", cx:80, cy:540, color:COLORS.PH, label:["PROGRAM","HEAD"], FX:163,
      connects:[
        { uc:"UC1", dash:true, lbl:"<<data source>>" },
        { uc:"UC2", dash:true, lbl:"<<data source>>" },
        { uc:"UC8", yo:-9 },          // ← Program Head is also a reviewer
      ],
    },
    {
      id:"LD", cx:80, cy:718, color:COLORS.LD, label:["LIBRARY","DIRECTOR"], FX:177,
      connects:[
        { uc:"UC4", dash:true, lbl:"<<data source>>" },
        { uc:"UC8", yo:-4 },
      ],
    },
    {
      id:"IC", cx:80, cy:862, color:COLORS.IC, label:["INDUSTRY","CONSULTANT"], FX:191,
      connects:[{ uc:"UC8", yo:3 }],
    },
    {
      id:"DEAN", cx:80, cy:992, color:COLORS.DEAN, label:["DEAN"], FX:205,
      connects:[{ uc:"UC8", yo:8 }],
    },
  ];

  // ── UC-to-UC relationship definitions ────────────────────────────
  const UCRELS = [
    { from:"UC2",  to:"UC3",  dir:"down", lbl:"<<includes>>" },
    { from:"UC3",  to:"UC4",  dir:"down", lbl:"<<includes>>" },
    { from:"UC4",  to:"UC5",  dir:"down", lbl:"<<includes>>" },
    { from:"UC3e", to:"UC3",  dir:"left", lbl:"<<extends>>"  },
    { from:"UC4e", to:"UC4",  dir:"left", lbl:"<<extends>>"  },
    { from:"UC5e", to:"UC5",  dir:"left", lbl:"<<extends>>"  },
  ];

  // ── Build curved elbow paths ──────────────────────────────────────
  // Each connection uses an L-shaped path with Bezier-rounded corners:
  //   actor-body → horizontal → [curved corner] → vertical → [curved corner] → horizontal → UC
  //
  // Corner radius = 9px (matches the look of Image 2 reference)
  const CR = 9;

  const buildPath = (x1, y1, xFX, x2, y2) => {
    const dy = y2 - y1;
    if (Math.abs(dy) < 3) {
      // Actor and UC at same height — straight horizontal
      return `M ${x1} ${y1} H ${x2}`;
    }
    const sign = dy > 0 ? 1 : -1; // +1 = going DOWN, -1 = going UP
    return [
      `M ${x1} ${y1}`,
      `H ${xFX - CR}`,                                         // horizontal to just before bend
      `Q ${xFX} ${y1} ${xFX} ${y1 + sign * CR}`,             // smooth 90° corner (down/up)
      `V ${y2 - sign * CR}`,                                   // vertical to just before next bend
      `Q ${xFX} ${y2} ${xFX + CR} ${y2}`,                    // smooth 90° corner (right)
      `H ${x2}`,                                               // horizontal to UC left edge
    ].join(" ");
  };

  // Render all actor → UC connection lines
  const actorLines = ACTORS.flatMap(({ id, cx, cy, color, connects, FX }) => {
    const bcy = cy + 22; // actor body / torso centre y

    return connects.flatMap((c, i) => {
      const u   = UCS[c.uc];
      const tx  = u.cx - u.rx;           // UC left-edge x
      const ty  = u.cy + (c.yo || 0);    // UC connection y (with optional offset)
      const d   = buildPath(cx, bcy, FX, tx, ty);

      const els = [
        <path key={`${id}-c${i}`} d={d}
          fill="none"
          stroke={color}
          strokeWidth="1.3"
          strokeLinecap="round"
          strokeDasharray={c.dash ? "6,3" : undefined}
          markerEnd={c.dash ? "url(#oA)" : undefined}
        />,
      ];

      if (c.lbl) {
        // Label sits above the horizontal branch to the UC
        els.push(
          <text key={`${id}-lbl${i}`}
            x={(FX + tx) / 2} y={ty - 7}
            textAnchor="middle" fontSize="9"
            fontFamily="Arial, sans-serif" fontStyle="italic">
            {c.lbl}
          </text>
        );
      }

      return els;
    });
  });

  // Render UC-to-UC relationship arrows (include / extend)
  const ucRelArrows = UCRELS.map((rel, i) => {
    const F = UCS[rel.from], T = UCS[rel.to];
    let x1, y1, x2, y2, lx, ly, ta;

    if (rel.dir === "down") {
      // Includes: base bottom → included top (pointing downward)
      x1 = F.cx;       y1 = F.cy + F.ry + 1;
      x2 = T.cx;       y2 = T.cy - T.ry - 1;
      lx = F.cx + 16;  ly = (y1 + y2) / 2 - 5;  ta = "start";
    } else {
      // Extends: extension left edge → base right edge (pointing leftward)
      x1 = F.cx - F.rx - 1;  y1 = F.cy;
      x2 = T.cx + T.rx + 1;  y2 = T.cy;
      lx = (x1 + x2) / 2;    ly = y1 - 10;  ta = "middle";
    }

    return (
      <g key={`ucr${i}`}>
        <line x1={x1} y1={y1} x2={x2} y2={y2}
          stroke="black" strokeWidth="1"
          strokeDasharray="7,3.5"
          markerEnd="url(#oA)" />
        <text x={lx} y={ly} textAnchor={ta}
          fontSize="9.5" fontFamily="Arial, sans-serif" fontStyle="italic">
          {rel.lbl}
        </text>
      </g>
    );
  });

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <div style={{ padding: 16, background: "#fff", overflow: "auto" }}>
      <svg width={W} height={H} style={{ display: "block" }}>

        {/* Open-arrowhead marker for dashed relationships */}
        <defs>
          <marker id="oA" markerWidth="10" markerHeight="8"
            refX="9" refY="4" orient="auto">
            <path d="M0,0 L10,4 L0,8"
              fill="none" stroke="black" strokeWidth="1.2" />
          </marker>
        </defs>

        {/* Title */}
        <text x={BX + BW / 2} y={46}
          textAnchor="middle"
          fontSize="17" fontFamily="Arial, sans-serif" fontWeight="bold">
          Learning Plan Composition
        </text>

        {/* System boundary — plain rectangle (matches Image 2) */}
        <rect x={BX} y={BY} width={BW} height={BH}
          fill="white" stroke="black" strokeWidth="1.5" />

        {/* Actor → UC curved elbow connections (drawn first, behind UCs) */}
        {actorLines}

        {/* UC-to-UC include / extend arrows */}
        {ucRelArrows}

        {/* Use-case ellipses */}
        {Object.entries(UCS).map(([id, u]) => (
          <UCEllipse key={id}
            cx={u.cx} cy={u.cy} rx={u.rx} ry={u.ry} label={u.label} />
        ))}

        {/* Actors (drawn last so labels sit on top) */}
        {ACTORS.map(a => (
          <Actor key={a.id}
            cx={a.cx} cy={a.cy} label={a.label} color={a.color} />
        ))}

      </svg>
    </div>
  );
}
