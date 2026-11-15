using System.Globalization;
using System.Text;

namespace TsukuyomiFocus.Domain.ValueObjects;

public sealed record SharinganVisualParameters
{
    public string PatternType { get; init; } = AnimeAccurateSharinganSvgBuilder.PatternTypes.ItachiShuriken;
    public string PrimaryLineage { get; init; } = SharinganCanonicalLayers.Lineages.Itachi;
    public string? SecondaryLineage { get; init; }
    public bool IsEternalFusion { get; init; }
    public string CenterShape { get; init; } = AnimeAccurateSharinganSvgBuilder.CenterShapes.Circle;
    public string BladeStyle { get; init; } = AnimeAccurateSharinganSvgBuilder.BladeStyles.CurvedShuriken;
    public string OuterRingStyle { get; init; } = AnimeAccurateSharinganSvgBuilder.OuterRingStyles.TomoeRing;
    public int BladeCount { get; init; } = 3;
    public string PrimaryCrimsonHex { get; init; } = "#DC2626";
    public string SecondaryDarkHex { get; init; } = "#450A0A";
    public bool HasAmaterasuFlames { get; init; }
    public double RotationOffset { get; init; }
    public string? CustomSvgOverlay { get; init; }
    public string? UniqueId { get; init; }
    public bool UsePolymorphicBlades { get; init; }
}

public static class AnimeAccurateSharinganSvgBuilder
{
    public static class PatternTypes
    {
        public const string EternalFusion = "eternal_fusion";
        public const string ItachiShuriken = "itachi_shuriken";
        public const string SasukeAtomic = "sasuke_atomic";
        public const string ShisuiKotoamatsukami = "shisui_kotoamatsukami";
        public const string ObitoKamui = "obito_kamui";
        public const string MadaraEternal = "madara_eternal";
        public const string IndraSpiral = "indra_spiral";
    }

    public static class CenterShapes
    {
        public const string Circle = "circle";
        public const string Square = "square";
        public const string Diamond = "diamond";
        public const string Triangle = "triangle";
        public const string Hexagram = "hexagram";
        public const string Vortex = "vortex";
    }

    public static class BladeStyles
    {
        public const string CurvedShuriken = "curved_shuriken";
        public const string StraightKatana = "straight_katana";
        public const string SquareGeometric = "square_geometric";
        public const string AtomicRings = "atomic_rings";
        public const string FlameSerrated = "flame_serrated";
        public const string SpiralKamui = "spiral_kamui";
    }

    public static class OuterRingStyles
    {
        public const string TomoeRing = "tomoe_ring";
        public const string RunicSeal = "runic_seal";
        public const string DoubleRinneRipple = "double_rinne_ripple";
        public const string SquareCage = "square_cage";
        public const string AmaterasuFire = "amaterasu_fire";
    }

    public static string NormalizePatternType(string? patternType, string? styleVariant = null)
    {
        var candidate = patternType?.Trim().ToLowerInvariant();
        switch (candidate)
        {
            case PatternTypes.EternalFusion:
            case "fusion":
            case "ems":
                return PatternTypes.EternalFusion;
            case PatternTypes.ItachiShuriken:
            case "itachi":
                return PatternTypes.ItachiShuriken;
            case PatternTypes.SasukeAtomic:
            case "sasuke":
                return PatternTypes.SasukeAtomic;
            case PatternTypes.ShisuiKotoamatsukami:
            case "shisui":
                return PatternTypes.ShisuiKotoamatsukami;
            case PatternTypes.ObitoKamui:
            case "obito":
                return PatternTypes.ObitoKamui;
            case PatternTypes.MadaraEternal:
            case "madara":
                return PatternTypes.MadaraEternal;
            case PatternTypes.IndraSpiral:
            case "indra":
            case "custom":
                return PatternTypes.IndraSpiral;
        }

        return (styleVariant?.Trim().ToLowerInvariant()) switch
        {
            LoreRules.MangekyouVariants.Sasuke => PatternTypes.SasukeAtomic,
            LoreRules.MangekyouVariants.Shisui => PatternTypes.ShisuiKotoamatsukami,
            LoreRules.MangekyouVariants.Obito => PatternTypes.ObitoKamui,
            LoreRules.MangekyouVariants.Madara => PatternTypes.MadaraEternal,
            "custom" => PatternTypes.EternalFusion,
            _ => PatternTypes.ItachiShuriken
        };
    }

    public static string NormalizeCenterShape(string? centerShape) => centerShape?.Trim().ToLowerInvariant() switch
    {
        CenterShapes.Square or "quadrado" or "cube" => CenterShapes.Square,
        CenterShapes.Diamond or "losango" => CenterShapes.Diamond,
        CenterShapes.Triangle or "triangulo" => CenterShapes.Triangle,
        CenterShapes.Hexagram or "star" or "estrela" => CenterShapes.Hexagram,
        CenterShapes.Vortex or "spiral" or "espiral" => CenterShapes.Vortex,
        _ => CenterShapes.Circle
    };

    public static string NormalizeBladeStyle(string? bladeStyle, string patternType)
    {
        var normalized = bladeStyle?.Trim().ToLowerInvariant();
        if (!string.IsNullOrEmpty(normalized))
        {
            return normalized switch
            {
                BladeStyles.CurvedShuriken => BladeStyles.CurvedShuriken,
                BladeStyles.StraightKatana => BladeStyles.StraightKatana,
                BladeStyles.SquareGeometric => BladeStyles.SquareGeometric,
                BladeStyles.AtomicRings => BladeStyles.AtomicRings,
                BladeStyles.FlameSerrated => BladeStyles.FlameSerrated,
                BladeStyles.SpiralKamui => BladeStyles.SpiralKamui,
                _ => GetDefaultBladeStyleForPattern(patternType)
            };
        }

        return GetDefaultBladeStyleForPattern(patternType);
    }

    public static string NormalizeOuterRingStyle(string? outerRingStyle, bool hasAmaterasuFlames)
    {
        var normalized = outerRingStyle?.Trim().ToLowerInvariant();
        if (!string.IsNullOrEmpty(normalized))
        {
            return normalized switch
            {
                OuterRingStyles.RunicSeal => OuterRingStyles.RunicSeal,
                OuterRingStyles.DoubleRinneRipple => OuterRingStyles.DoubleRinneRipple,
                OuterRingStyles.SquareCage => OuterRingStyles.SquareCage,
                OuterRingStyles.AmaterasuFire => OuterRingStyles.AmaterasuFire,
                _ => OuterRingStyles.TomoeRing
            };
        }

        return hasAmaterasuFlames ? OuterRingStyles.AmaterasuFire : OuterRingStyles.TomoeRing;
    }

    public static string Build(
        string? patternType,
        int bladeCount = 3,
        string? primaryCrimsonHex = null,
        string? secondaryDarkHex = null,
        bool hasAmaterasuFlames = false,
        double rotationOffset = 0,
        string? centerShape = null,
        string? bladeStyle = null,
        string? outerRingStyle = null,
        string? customSvgOverlay = null,
        string? primaryLineage = null,
        string? secondaryLineage = null,
        bool isEternalFusion = false)
    {
        var normalizedPattern = NormalizePatternType(patternType);
        return Build(new SharinganVisualParameters
        {
            PatternType = isEternalFusion ? PatternTypes.EternalFusion : normalizedPattern,
            PrimaryLineage = SharinganCanonicalLayers.NormalizeLineage(primaryLineage ?? normalizedPattern),
            SecondaryLineage = string.IsNullOrWhiteSpace(secondaryLineage)
                ? null
                : SharinganCanonicalLayers.NormalizeLineage(secondaryLineage),
            IsEternalFusion = isEternalFusion,
            CenterShape = NormalizeCenterShape(centerShape),
            BladeStyle = NormalizeBladeStyle(bladeStyle, normalizedPattern),
            OuterRingStyle = NormalizeOuterRingStyle(outerRingStyle, hasAmaterasuFlames),
            BladeCount = bladeCount,
            PrimaryCrimsonHex = SharinganSvgHelper.NormalizeHexColor(primaryCrimsonHex),
            SecondaryDarkHex = SharinganSvgHelper.NormalizeHexColor(secondaryDarkHex, "#450A0A"),
            HasAmaterasuFlames = hasAmaterasuFlames,
            RotationOffset = rotationOffset,
            CustomSvgOverlay = customSvgOverlay
        });
    }

    public static string Build(SharinganVisualParameters parameters)
    {
        ArgumentNullException.ThrowIfNull(parameters);

        var normalizedPattern = NormalizePatternType(parameters.PatternType);
        var primaryLineage = SharinganCanonicalLayers.NormalizeLineage(
            string.IsNullOrWhiteSpace(parameters.PrimaryLineage) ? normalizedPattern : parameters.PrimaryLineage);
        var hasExplicitSecondary = !string.IsNullOrWhiteSpace(parameters.SecondaryLineage);
        var isFusion = parameters.IsEternalFusion ||
                       normalizedPattern == PatternTypes.EternalFusion ||
                       hasExplicitSecondary;

        var centerShape = NormalizeCenterShape(parameters.CenterShape);
        var bladeStyle = NormalizeBladeStyle(parameters.BladeStyle, normalizedPattern);
        var outerRingStyle = NormalizeOuterRingStyle(parameters.OuterRingStyle, parameters.HasAmaterasuFlames);
        var count = Math.Clamp(
            parameters.BladeCount <= 0 ? GetDefaultBladeCount(normalizedPattern) : parameters.BladeCount,
            2,
            12);
        var primary = SharinganSvgHelper.NormalizeHexColor(parameters.PrimaryCrimsonHex);
        var secondary = SharinganSvgHelper.NormalizeHexColor(parameters.SecondaryDarkHex, "#450A0A");
        var baseRotation = ((parameters.RotationOffset % 360) + 360) % 360;

        var invertBaseForSasukeSolo = !isFusion &&
                                      primaryLineage == SharinganCanonicalLayers.Lineages.Sasuke &&
                                      bladeStyle == BladeStyles.AtomicRings &&
                                      centerShape == CenterShapes.Circle;

        var rawUid = string.IsNullOrWhiteSpace(parameters.UniqueId)
            ? Guid.NewGuid().ToString("N")[..8]
            : new string(parameters.UniqueId.Where(char.IsLetterOrDigit).ToArray());
        var uid = string.IsNullOrEmpty(rawUid) ? Guid.NewGuid().ToString("N")[..8] : rawUid;

        var sb = new StringBuilder();
        sb.AppendLine("""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512" preserveAspectRatio="xMidYMid meet">""");
        sb.AppendLine("  <defs>");
        sb.AppendLine($"""    <clipPath id="irisClip-{uid}"><circle cx="256" cy="256" r="250" /></clipPath>""");
        SharinganCanonicalLayers.AppendIrisGradientDefs(sb, primary, secondary, uid);
        sb.AppendLine("  </defs>");
        sb.AppendLine($"""  <g clip-path="url(#irisClip-{uid})">""");

        // Layer 1: Centered full-radius (r=250) Uchiha iris backdrop & radial fibers
        SharinganCanonicalLayers.AppendIrisBackground(sb, primary, secondary, invertBaseForSasukeSolo, uid);

        sb.AppendLine(FormattableString.Invariant(
            $"""    <g transform="rotate({baseRotation:F2} 256 256)">"""));

        if (isFusion)
        {
            var (secondaryUnderlay, primaryOverlay) = ResolveFusionLayerOrder(
                primaryLineage,
                parameters.SecondaryLineage);

            // Layer 2: External / Secondary Uchiha Structure (e.g., Madara ring, spokes & tomoes)
            SharinganCanonicalLayers.AppendLineageLayer(
                sb,
                secondaryUnderlay,
                primary,
                secondary,
                isUnderlay: true,
                isOverlayOnFusion: false);

            // Layer 3: Core / Primary Uchiha Silhouette (e.g., Itachi curved 3-blade pinwheel)
            SharinganCanonicalLayers.AppendLineageLayer(
                sb,
                primaryOverlay,
                primary,
                secondary,
                isUnderlay: false,
                isOverlayOnFusion: true);
        }
        else if (ShouldUsePolymorphicBlades(parameters, primaryLineage, normalizedPattern))
        {
            AppendPolymorphicBladesLayer(sb, bladeStyle, count, primary, secondary);
        }
        else
        {
            SharinganCanonicalLayers.AppendLineageLayer(
                sb,
                primaryLineage,
                primary,
                secondary,
                isUnderlay: false,
                isOverlayOnFusion: false);
        }

        // Layer 4: Symmetric prompt modifiers & hypnotic central pupil (no arbitrary LLM polygons)
        SharinganCanonicalLayers.AppendSymmetricCustomGeometry(
            sb,
            centerShape,
            outerRingStyle,
            parameters.HasAmaterasuFlames,
            primary,
            secondary);
        SharinganCanonicalLayers.AppendHypnoticPupil(sb, primary);

        sb.AppendLine("    </g>");

        // Centered outer limbal shadow & clean iris border (r=250)
        sb.AppendLine($"""    <circle cx="256" cy="256" r="250" fill="url(#limbalVignette-{uid})" />""");
        sb.AppendLine("""    <circle cx="256" cy="256" r="248" fill="none" stroke="#050505" stroke-width="10" opacity="0.95" />""");

        sb.AppendLine("  </g>");
        sb.AppendLine("</svg>");
        return sb.ToString();
    }

    public static (string SecondaryUnderlay, string PrimaryOverlay) ResolveFusionLayerOrder(
        string? rawPrimaryLineage,
        string? rawSecondaryLineage)
    {
        var first = SharinganCanonicalLayers.NormalizeLineage(rawPrimaryLineage);
        var second = string.IsNullOrWhiteSpace(rawSecondaryLineage)
            ? PickComplementaryLineage(first)
            : SharinganCanonicalLayers.NormalizeLineage(rawSecondaryLineage);

        if (first == second)
        {
            second = PickComplementaryLineage(first);
        }

        // Madara's outer ring + Choku-Tomoe spokes + 3 tomoes form the ideal external EMS scaffold
        if (first == SharinganCanonicalLayers.Lineages.Madara)
        {
            return (SharinganCanonicalLayers.Lineages.Madara, second);
        }

        if (second == SharinganCanonicalLayers.Lineages.Madara)
        {
            return (SharinganCanonicalLayers.Lineages.Madara, first);
        }

        // Sasuke's 6-point atom acts as the structural underlay behind pinwheel/scythe cores
        if (first == SharinganCanonicalLayers.Lineages.Sasuke)
        {
            return (SharinganCanonicalLayers.Lineages.Sasuke, second);
        }

        if (second == SharinganCanonicalLayers.Lineages.Sasuke)
        {
            return (SharinganCanonicalLayers.Lineages.Sasuke, first);
        }

        return (second, first);
    }

    private static string PickComplementaryLineage(string primary) => primary switch
    {
        SharinganCanonicalLayers.Lineages.Madara => SharinganCanonicalLayers.Lineages.Itachi,
        SharinganCanonicalLayers.Lineages.Sasuke => SharinganCanonicalLayers.Lineages.Itachi,
        _ => SharinganCanonicalLayers.Lineages.Madara
    };

    public static int GetDefaultBladeCount(string patternType) => patternType switch
    {
        PatternTypes.SasukeAtomic => 6,
        PatternTypes.ShisuiKotoamatsukami => 4,
        PatternTypes.IndraSpiral => 6,
        _ => 3
    };

    private static string GetDefaultBladeStyleForPattern(string patternType) => patternType switch
    {
        PatternTypes.SasukeAtomic => BladeStyles.AtomicRings,
        PatternTypes.ShisuiKotoamatsukami => BladeStyles.StraightKatana,
        PatternTypes.ObitoKamui => BladeStyles.SpiralKamui,
        PatternTypes.IndraSpiral => BladeStyles.SpiralKamui,
        _ => BladeStyles.CurvedShuriken
    };

    private static bool ShouldUsePolymorphicBlades(
        SharinganVisualParameters parameters,
        string primaryLineage,
        string normalizedPattern) =>
        parameters.UsePolymorphicBlades ||
        primaryLineage == SharinganCanonicalLayers.Lineages.Indra ||
        normalizedPattern == PatternTypes.IndraSpiral;

    private static void AppendPolymorphicBladesLayer(
        StringBuilder sb,
        string bladeStyle,
        int count,
        string primary,
        string secondary)
    {
        if (bladeStyle == BladeStyles.AtomicRings)
        {
            var atomicRotations = Math.Max(3, Math.Min(6, (count + 1) / 2));
            var step = 180.0 / atomicRotations;
            for (var i = 0; i < atomicRotations; i++)
            {
                var angle = i * step;
                sb.AppendLine(FormattableString.Invariant(
                    $"""      <g transform="rotate({angle:F2} 256 256)">"""));
                sb.AppendLine($"""        <path d="M 256 26 C 332 114, 332 398, 256 486 C 180 398, 180 114, 256 26 Z" fill="{primary}" fill-opacity="0.52" stroke="#050505" stroke-width="14" stroke-linejoin="round" />""");
                sb.AppendLine($"""        <path d="M 256 44 C 308 130, 308 382, 256 468 C 204 382, 204 130, 256 44 Z" fill="none" stroke="{secondary}" stroke-width="3.5" opacity="0.88" />""");
                sb.AppendLine("      </g>");
            }

            return;
        }

        sb.AppendLine($"""      <circle cx="256" cy="256" r="128" fill="none" stroke="#050505" stroke-width="14" opacity="0.82" />""");
        sb.AppendLine($"""      <circle cx="256" cy="256" r="128" fill="none" stroke="{primary}" stroke-width="2" opacity="0.58" />""");

        var radialStep = 360.0 / count;
        for (var i = 0; i < count; i++)
        {
            var angle = i * radialStep;
            sb.AppendLine(FormattableString.Invariant(
                $"""      <g transform="rotate({angle:F2} 256 256)">"""));

            switch (bladeStyle)
            {
                case BladeStyles.SquareGeometric:
                    sb.AppendLine($"""        <rect x="236" y="42" width="40" height="156" rx="4" fill="#050505" stroke="{primary}" stroke-width="2" />""");
                    sb.AppendLine($"""        <rect x="244" y="54" width="24" height="122" rx="2" fill="none" stroke="{primary}" stroke-width="2.5" opacity="0.72" />""");
                    break;

                case BladeStyles.StraightKatana:
                    sb.AppendLine($"""        <polygon points="256,22 280,130 268,224 244,224 232,130" fill="#050505" stroke="{primary}" stroke-width="2" stroke-linejoin="round" />""");
                    sb.AppendLine($"""        <line x1="256" y1="40" x2="256" y2="210" stroke="{primary}" stroke-width="3" opacity="0.82" />""");
                    break;

                case BladeStyles.FlameSerrated:
                    sb.AppendLine($"""        <path d="M 256 238 C 224 190, 212 142, 236 104 L 224 76 L 252 60 L 256 22 L 280 74 L 266 96 C 292 134, 286 188, 256 238 Z" fill="#050505" stroke="{primary}" stroke-width="2" stroke-linejoin="round" />""");
                    sb.AppendLine($"""        <path d="M 256 218 C 240 176, 238 126, 256 48" fill="none" stroke="{primary}" stroke-width="2.8" opacity="0.78" />""");
                    break;

                case BladeStyles.SpiralKamui:
                    sb.AppendLine($"""        <path d="M 236 214 C 232 142, 270 76, 362 46 C 314 108, 294 162, 288 218 Z" fill="#050505" stroke="{primary}" stroke-width="2.2" stroke-linejoin="round" />""");
                    sb.AppendLine($"""        <path d="M 252 204 C 254 146, 286 98, 344 64" fill="none" stroke="{primary}" stroke-width="2.4" opacity="0.78" />""");
                    break;

                default: // Sharp ninja scythe / shuriken (never rounded flower petals)
                    sb.AppendLine($"""        <path d="M 224 214 C 216 122, 274 54, 372 44 C 318 100, 296 156, 298 216 Z" fill="#050505" stroke="{primary}" stroke-width="2.2" stroke-linejoin="round" />""");
                    sb.AppendLine($"""        <path d="M 240 206 C 236 136, 282 82, 352 56" fill="none" stroke="{primary}" stroke-width="2.5" stroke-linecap="round" opacity="0.8" />""");
                    break;
            }

            sb.AppendLine("      </g>");
        }
    }
}
