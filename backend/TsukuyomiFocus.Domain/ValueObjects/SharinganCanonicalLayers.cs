using System.Globalization;
using System.Text;

namespace TsukuyomiFocus.Domain.ValueObjects;

/// <summary>
/// Canonical Uchiha Mangekyou &amp; Eternal Mangekyou Sharingan vector layers.
/// Every primitive and curve is mathematically centered at (256, 256) in a 512x512 viewBox
/// with razor-sharp ninja shuriken/scythe Bézier paths (never rounded flower petals or skewed polygons).
/// </summary>
public static class SharinganCanonicalLayers
{
    public static class Lineages
    {
        public const string Itachi = "itachi";
        public const string Madara = "madara";
        public const string Sasuke = "sasuke";
        public const string Obito = "obito";
        public const string Shisui = "shisui";
        public const string Indra = "indra";
    }

    public static string NormalizeLineage(string? raw)
    {
        var candidate = raw?.Trim().ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(candidate))
        {
            return Lineages.Itachi;
        }

        if (candidate.Contains("madara", StringComparison.Ordinal))
        {
            return Lineages.Madara;
        }

        if (candidate.Contains("sasuke", StringComparison.Ordinal))
        {
            return Lineages.Sasuke;
        }

        if (candidate.Contains("obito", StringComparison.Ordinal) ||
            candidate.Contains("kakashi", StringComparison.Ordinal) ||
            candidate.Contains("kamui", StringComparison.Ordinal))
        {
            return Lineages.Obito;
        }

        if (candidate.Contains("shisui", StringComparison.Ordinal) ||
            candidate.Contains("kotoamatsukami", StringComparison.Ordinal))
        {
            return Lineages.Shisui;
        }

        if (candidate.Contains("indra", StringComparison.Ordinal))
        {
            return Lineages.Indra;
        }

        return Lineages.Itachi;
    }

    public static void AppendIrisGradientDefs(
        StringBuilder sb,
        string primaryCrimson,
        string secondaryDark,
        string uid = "0")
    {
        sb.AppendLine($$"""
                <radialGradient id="irisGrad-{{uid}}" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stop-color="#E11D48" />
                  <stop offset="28%" stop-color="{{primaryCrimson}}" />
                  <stop offset="66%" stop-color="#991B1B" />
                  <stop offset="88%" stop-color="{{secondaryDark}}" />
                  <stop offset="100%" stop-color="#050505" />
                </radialGradient>
                <radialGradient id="limbalVignette-{{uid}}" cx="50%" cy="50%" r="50%">
                  <stop offset="58%" stop-color="#050505" stop-opacity="0" />
                  <stop offset="84%" stop-color="#050505" stop-opacity="0.52" />
                  <stop offset="100%" stop-color="#050505" stop-opacity="0.96" />
                </radialGradient>
            """);

        // Special vivid iris gradient that respects explicit non-crimson colors while preserving Uchiha depth
        sb.AppendLine($$"""
                <radialGradient id="irisCustomGrad-{{uid}}" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stop-color="{{primaryCrimson}}" />
                  <stop offset="48%" stop-color="{{primaryCrimson}}" stop-opacity="0.88" />
                  <stop offset="82%" stop-color="{{secondaryDark}}" />
                  <stop offset="100%" stop-color="#050505" />
                </radialGradient>
            """);
    }

    /// <summary>
    /// Layer 1: Full-radius (r=250) iris background + radial ocular striations centered at (256, 256).
    /// </summary>
    public static void AppendIrisBackground(
        StringBuilder sb,
        string primaryCrimson,
        string secondaryDark,
        bool invertBaseForSasukeSolo,
        string uid = "0")
    {
        var useClassicCrimson = string.Equals(primaryCrimson, "#DC2626", StringComparison.OrdinalIgnoreCase);
        var gradRef = useClassicCrimson ? $"url(#irisGrad-{uid})" : $"url(#irisCustomGrad-{uid})";

        sb.AppendLine("""    <circle cx="256" cy="256" r="256" fill="#050505" />""");
        sb.AppendLine(invertBaseForSasukeSolo
            ? """    <circle cx="256" cy="256" r="250" fill="#050505" />"""
            : $"""    <circle cx="256" cy="256" r="250" fill="{gradRef}" />""");

        // 36 radial ocular fibers centered at (256, 256)
        sb.AppendLine($"""    <g stroke="{(invertBaseForSasukeSolo ? primaryCrimson : "#050505")}" stroke-width="1.5" opacity="0.16">""");
        for (var i = 0; i < 36; i++)
        {
            var angle = i * 10.0;
            var outerY = i % 2 == 0 ? 32 : 46;
            var innerY = i % 2 == 0 ? 112 : 124;
            sb.AppendLine(FormattableString.Invariant(
                $"""      <line x1="256" y1="{outerY}" x2="256" y2="{innerY}" transform="rotate({angle:F2} 256 256)" />"""));
        }
        sb.AppendLine("    </g>");

        // Subtle concentric striations centered at (256, 256)
        sb.AppendLine($"""    <circle cx="256" cy="256" r="222" fill="none" stroke="{primaryCrimson}" stroke-width="6" stroke-dasharray="2 10" opacity="0.22" />""");
        sb.AppendLine("""    <circle cx="256" cy="256" r="184" fill="none" stroke="#050505" stroke-width="12" stroke-dasharray="2 11" opacity="0.26" />""");
    }

    public static void AppendLineageLayer(
        StringBuilder sb,
        string lineage,
        string primary,
        string secondary,
        bool isUnderlay,
        bool isOverlayOnFusion)
    {
        switch (NormalizeLineage(lineage))
        {
            case Lineages.Madara:
                AppendMadaraLayer(sb, primary, isUnderlay);
                break;
            case Lineages.Sasuke:
                AppendSasukeLayer(sb, primary, secondary, isUnderlay);
                break;
            case Lineages.Obito:
                AppendObitoLayer(sb, primary, isOverlayOnFusion);
                break;
            case Lineages.Shisui:
                AppendShisuiLayer(sb, primary, isOverlayOnFusion);
                break;
            case Lineages.Indra:
                AppendIndraLayer(sb, primary, isOverlayOnFusion);
                break;
            default:
                AppendItachiLayer(sb, primary, isOverlayOnFusion);
                break;
        }
    }

    public static void AppendMadaraLayer(StringBuilder sb, string primary, bool isSecondaryUnderlay)
    {
        var ringStroke = isSecondaryUnderlay ? "24" : "22";
        sb.AppendLine($"""      <circle cx="256" cy="256" r="144" fill="none" stroke="#050505" stroke-width="{ringStroke}" />""");
        sb.AppendLine($"""      <circle cx="256" cy="256" r="144" fill="none" stroke="{primary}" stroke-width="2.5" opacity="0.78" />""");

        int[] angles = [0, 120, 240];
        foreach (var angle in angles)
        {
            sb.AppendLine(FormattableString.Invariant(
                $"""      <g transform="rotate({angle:F2} 256 256)">"""));
            // Choku-Tomoe straight spoke cutting through ring to pointed outer tip
            sb.AppendLine($"""        <path d="M 243 256 L 245 78 L 256 34 L 267 78 L 269 256 Z" fill="#050505" stroke="{primary}" stroke-width="2" stroke-linejoin="round" />""");
            sb.AppendLine($"""        <line x1="256" y1="54" x2="256" y2="214" stroke="{primary}" stroke-width="2.5" opacity="0.85" />""");
            // Sharp curved Madara tomoe tail wrapping clockwise along the r=144 ring
            sb.AppendLine($"""        <path d="M 278 82 C 348 94, 394 148, 386 218 C 366 164, 328 132, 278 128 Z" fill="#050505" stroke="{primary}" stroke-width="1.8" stroke-linejoin="round" />""");
            // Large Madara tomoe orb anchored on r=144 at (256, 112)
            sb.AppendLine($"""        <circle cx="256" cy="112" r="36" fill="#050505" stroke="{primary}" stroke-width="2.5" />""");
            sb.AppendLine($"""        <circle cx="256" cy="112" r="14" fill="{primary}" />""");
            sb.AppendLine("""        <circle cx="256" cy="112" r="6" fill="#050505" />""");
            sb.AppendLine("      </g>");
        }
    }

    public static void AppendItachiLayer(StringBuilder sb, string primary, bool isOverlayOnFusion)
    {
        var strokeW = isOverlayOnFusion ? "2.8" : "2.0";

        int[] angles = [0, 120, 240];
        foreach (var angle in angles)
        {
            sb.AppendLine(FormattableString.Invariant(
                $"""      <g transform="rotate({angle:F2} 256 256)">"""));
            // Razor-sharp curved ninja scythe pinwheel blade (convex outer edge + concave inner scythe arc)
            sb.AppendLine($"""        <path d="M 220 214 C 210 116, 272 52, 376 42 C 320 98, 298 156, 302 218 Z" fill="#050505" stroke="{primary}" stroke-width="{strokeW}" stroke-linejoin="round" />""");
            sb.AppendLine($"""        <path d="M 238 206 C 234 134, 282 80, 356 54" fill="none" stroke="{primary}" stroke-width="2.8" stroke-linecap="round" opacity="0.85" />""");
            sb.AppendLine("      </g>");
        }

        sb.AppendLine($"""      <circle cx="256" cy="256" r="56" fill="#050505" stroke="{primary}" stroke-width="3" />""");
    }

    public static void AppendSasukeLayer(
        StringBuilder sb,
        string primary,
        string secondary,
        bool isSecondaryUnderlay)
    {
        var fillOp = isSecondaryUnderlay ? "0.58" : "0.78";
        int[] angles = [0, 60, 120];

        foreach (var angle in angles)
        {
            sb.AppendLine(FormattableString.Invariant(
                $"""      <g transform="rotate({angle:F2} 256 256)">"""));
            sb.AppendLine($"""        <path d="M 256 18 C 332 108, 332 404, 256 494 C 180 404, 180 108, 256 18 Z" fill="{primary}" fill-opacity="{fillOp}" stroke="#050505" stroke-width="14" stroke-linejoin="round" />""");
            sb.AppendLine($"""        <path d="M 256 38 C 312 124, 312 388, 256 474 C 200 388, 200 124, 256 38 Z" fill="none" stroke="{secondary}" stroke-width="3" opacity="0.82" />""");
            sb.AppendLine("      </g>");
        }

        foreach (var angle in angles)
        {
            sb.AppendLine(FormattableString.Invariant(
                $"""      <g transform="rotate({angle:F2} 256 256)">"""));
            sb.AppendLine("""        <path d="M 256 38 C 312 124, 312 388, 256 474 C 200 388, 200 124, 256 38 Z" fill="none" stroke="#050505" stroke-width="9" />""");
            sb.AppendLine($"""        <path d="M 256 38 C 312 124, 312 388, 256 474 C 200 388, 200 124, 256 38 Z" fill="none" stroke="{primary}" stroke-width="2" opacity="0.85" />""");
            sb.AppendLine("      </g>");
        }
    }

    public static void AppendObitoLayer(StringBuilder sb, string primary, bool isOverlayOnFusion)
    {
        var strokeW = isOverlayOnFusion ? "2.8" : "2.0";

        int[] angles = [0, 120, 240];
        foreach (var angle in angles)
        {
            sb.AppendLine(FormattableString.Invariant(
                $"""      <g transform="rotate({angle:F2} 256 256)">"""));
            sb.AppendLine($"""        <path d="M 234 210 C 220 122, 266 46, 374 46 C 418 46, 434 94, 396 118 C 400 84, 368 70, 328 88 C 292 108, 286 162, 296 214 Z" fill="#050505" stroke="{primary}" stroke-width="{strokeW}" stroke-linejoin="round" />""");
            sb.AppendLine($"""        <path d="M 250 202 C 242 134, 282 72, 368 62" fill="none" stroke="{primary}" stroke-width="2.5" stroke-linecap="round" opacity="0.82" />""");
            sb.AppendLine("      </g>");
        }

        sb.AppendLine($"""      <circle cx="256" cy="256" r="56" fill="#050505" stroke="{primary}" stroke-width="3" />""");
    }

    public static void AppendShisuiLayer(StringBuilder sb, string primary, bool isOverlayOnFusion)
    {
        var strokeW = isOverlayOnFusion ? "2.8" : "2.0";

        int[] angles = [0, 90, 180, 270];
        foreach (var angle in angles)
        {
            sb.AppendLine(FormattableString.Invariant(
                $"""      <g transform="rotate({angle:F2} 256 256)">"""));
            sb.AppendLine($"""        <path d="M 228 208 C 222 118, 286 44, 386 44 C 324 94, 296 154, 302 210 Z" fill="#050505" stroke="{primary}" stroke-width="{strokeW}" stroke-linejoin="round" />""");
            sb.AppendLine($"""        <path d="M 244 198 C 242 132, 292 74, 364 56" fill="none" stroke="{primary}" stroke-width="2.5" stroke-linecap="round" opacity="0.82" />""");
            sb.AppendLine("      </g>");
        }

        sb.AppendLine($"""      <circle cx="256" cy="256" r="56" fill="#050505" stroke="{primary}" stroke-width="3" />""");
    }

    public static void AppendIndraLayer(StringBuilder sb, string primary, bool isOverlayOnFusion)
    {
        var strokeW = isOverlayOnFusion ? "2.6" : "2.0";
        sb.AppendLine("""      <circle cx="256" cy="256" r="154" fill="none" stroke="#050505" stroke-width="14" opacity="0.92" />""");
        sb.AppendLine($"""      <circle cx="256" cy="256" r="154" fill="none" stroke="{primary}" stroke-width="2.5" opacity="0.72" />""");

        for (var i = 0; i < 6; i++)
        {
            var angle = i * 60.0;
            sb.AppendLine(FormattableString.Invariant(
                $"""      <g transform="rotate({angle:F2} 256 256)">"""));
            sb.AppendLine($"""        <path d="M 236 218 C 232 146, 264 78, 342 32 C 296 102, 286 158, 286 218 Z" fill="#050505" stroke="{primary}" stroke-width="{strokeW}" stroke-linejoin="round" />""");
            sb.AppendLine($"""        <path d="M 250 206 C 248 150, 272 98, 326 52" fill="none" stroke="{primary}" stroke-width="2.2" stroke-linecap="round" opacity="0.82" />""");
            sb.AppendLine("      </g>");
        }

        sb.AppendLine($"""      <circle cx="256" cy="256" r="54" fill="#050505" stroke="{primary}" stroke-width="3" />""");
    }

    /// <summary>
    /// Layer 4A: Symmetric prompt-driven geometric modifiers mathematically centered at (256, 256).
    /// </summary>
    public static void AppendSymmetricCustomGeometry(
        StringBuilder sb,
        string centerShape,
        string outerRingStyle,
        bool hasAmaterasuFlames,
        string primary,
        string secondary)
    {
        if (outerRingStyle == AnimeAccurateSharinganSvgBuilder.OuterRingStyles.RunicSeal)
        {
            sb.AppendLine("""      <circle cx="256" cy="256" r="206" fill="none" stroke="#050505" stroke-width="10" opacity="0.9" />""");
            sb.AppendLine($"""      <circle cx="256" cy="256" r="196" fill="none" stroke="{primary}" stroke-width="2" opacity="0.68" />""");
            for (var i = 0; i < 16; i++)
            {
                var angle = i * 22.5;
                sb.AppendLine(FormattableString.Invariant(
                    $"""      <g transform="rotate({angle:F2} 256 256)">"""));
                sb.AppendLine("""        <rect x="251" y="34" width="10" height="26" rx="2" fill="#050505" />""");
                sb.AppendLine($"""        <circle cx="256" cy="68" r="3.5" fill="{primary}" opacity="0.85" />""");
                sb.AppendLine("      </g>");
            }
        }
        else if (outerRingStyle == AnimeAccurateSharinganSvgBuilder.OuterRingStyles.DoubleRinneRipple)
        {
            sb.AppendLine("""      <circle cx="256" cy="256" r="214" fill="none" stroke="#050505" stroke-width="10" opacity="0.88" />""");
            sb.AppendLine("""      <circle cx="256" cy="256" r="168" fill="none" stroke="#050505" stroke-width="8" opacity="0.84" />""");
            sb.AppendLine($"""      <circle cx="256" cy="256" r="191" fill="none" stroke="{primary}" stroke-width="2" opacity="0.58" />""");
        }

        if (centerShape == AnimeAccurateSharinganSvgBuilder.CenterShapes.Square ||
            outerRingStyle == AnimeAccurateSharinganSvgBuilder.OuterRingStyles.SquareCage)
        {
            sb.AppendLine("""      <rect x="92" y="92" width="328" height="328" rx="8" fill="none" stroke="#050505" stroke-width="14" opacity="0.92" />""");
            sb.AppendLine($"""      <rect x="92" y="92" width="328" height="328" rx="8" fill="none" stroke="{primary}" stroke-width="2.5" opacity="0.82" />""");
            sb.AppendLine("""      <rect x="116" y="116" width="280" height="280" rx="6" fill="none" stroke="#050505" stroke-width="10" transform="rotate(45 256 256)" />""");
            sb.AppendLine($"""      <rect x="212" y="212" width="88" height="88" rx="4" fill="#050505" stroke="{primary}" stroke-width="3.5" />""");
            sb.AppendLine($"""      <rect x="224" y="224" width="64" height="64" rx="3" fill="none" stroke="{secondary}" stroke-width="2.5" transform="rotate(45 256 256)" />""");
        }
        else if (centerShape == AnimeAccurateSharinganSvgBuilder.CenterShapes.Diamond)
        {
            sb.AppendLine($"""      <polygon points="256,96 416,256 256,416 96,256" fill="none" stroke="#050505" stroke-width="12" stroke-linejoin="round" />""");
            sb.AppendLine($"""      <polygon points="256,96 416,256 256,416 96,256" fill="none" stroke="{primary}" stroke-width="2.5" stroke-linejoin="round" />""");
            sb.AppendLine($"""      <polygon points="256,192 320,256 256,320 192,256" fill="#050505" stroke="{primary}" stroke-width="3" stroke-linejoin="round" />""");
        }
        else if (centerShape == AnimeAccurateSharinganSvgBuilder.CenterShapes.Triangle)
        {
            // Equilateral triangle centered strictly at (256, 256), circumradius R=136
            sb.AppendLine($"""      <polygon points="256,120 373.8,324 138.2,324" fill="none" stroke="#050505" stroke-width="14" stroke-linejoin="round" />""");
            sb.AppendLine($"""      <polygon points="256,120 373.8,324 138.2,324" fill="none" stroke="{primary}" stroke-width="2.8" stroke-linejoin="round" />""");
        }
        else if (centerShape == AnimeAccurateSharinganSvgBuilder.CenterShapes.Hexagram)
        {
            // Mathematically exact 6-point hexagram centered at (256, 256)
            sb.AppendLine($"""      <polygon points="256,108 384.2,330 127.8,330" fill="none" stroke="#050505" stroke-width="12" stroke-linejoin="round" />""");
            sb.AppendLine($"""      <polygon points="256,404 384.2,182 127.8,182" fill="none" stroke="#050505" stroke-width="12" stroke-linejoin="round" />""");
            sb.AppendLine($"""      <polygon points="256,108 384.2,330 127.8,330" fill="none" stroke="{primary}" stroke-width="2.5" stroke-linejoin="round" />""");
            sb.AppendLine($"""      <polygon points="256,404 384.2,182 127.8,182" fill="none" stroke="{primary}" stroke-width="2.5" stroke-linejoin="round" />""");
        }
        else if (centerShape == AnimeAccurateSharinganSvgBuilder.CenterShapes.Vortex)
        {
            for (var i = 0; i < 3; i++)
            {
                var angle = i * 120.0;
                sb.AppendLine(FormattableString.Invariant(
                    $"""      <g transform="rotate({angle:F2} 256 256)">"""));
                sb.AppendLine($"""        <path d="M 256 256 C 242 224, 268 194, 310 202" fill="none" stroke="{primary}" stroke-width="3.5" stroke-linecap="round" opacity="0.92" />""");
                sb.AppendLine("      </g>");
            }
        }

        if (hasAmaterasuFlames || outerRingStyle == AnimeAccurateSharinganSvgBuilder.OuterRingStyles.AmaterasuFire)
        {
            AppendAmaterasuFlames(sb, primary, secondary);
        }
    }

    public static void AppendAmaterasuFlames(StringBuilder sb, string primary, string secondary)
    {
        sb.AppendLine("      <g>");
        for (var i = 0; i < 12; i++)
        {
            var angle = i * 30.0;
            sb.AppendLine(FormattableString.Invariant(
                $"""        <g transform="rotate({angle:F2} 256 256)">"""));
            sb.AppendLine("""          <path d="M 232 8 C 242 28, 240 46, 256 58 C 272 44, 270 24, 282 8 Z" fill="#050505" opacity="0.96" />""");
            sb.AppendLine($"""          <path d="M 244 10 C 248 24, 250 36, 256 46 C 262 36, 264 22, 268 10" fill="none" stroke="{primary}" stroke-width="2" opacity="0.72" />""");
            sb.AppendLine($"""          <path d="M 248 6 L 256 28 L 264 6 Z" fill="{secondary}" opacity="0.78" />""");
            sb.AppendLine("        </g>");
        }
        sb.AppendLine("      </g>");
    }

    /// <summary>
    /// Layer 4B: Centered hypnotic Uchiha pupil (cx=256, cy=256, r=22).
    /// </summary>
    public static void AppendHypnoticPupil(StringBuilder sb, string primary)
    {
        sb.AppendLine("""      <circle cx="256" cy="256" r="38" fill="#050505" />""");
        sb.AppendLine($"""      <circle cx="256" cy="256" r="22" fill="#050505" stroke="{primary}" stroke-width="4" />""");
        sb.AppendLine($"""      <circle cx="256" cy="256" r="9" fill="{primary}" opacity="0.95" />""");
        sb.AppendLine("""      <circle cx="256" cy="256" r="4" fill="#050505" />""");
    }
}
