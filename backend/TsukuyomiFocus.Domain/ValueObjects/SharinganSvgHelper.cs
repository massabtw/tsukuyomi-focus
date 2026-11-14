using System.Text;
using System.Xml.Linq;

namespace TsukuyomiFocus.Domain.ValueObjects;

public static class SharinganSvgHelper
{
    public static bool TryValidateAndSanitize(string? rawSvg, out string sanitizedSvg)
    {
        sanitizedSvg = string.Empty;
        if (string.IsNullOrWhiteSpace(rawSvg))
        {
            return false;
        }

        var trimmed = StripMarkdownFences(rawSvg);
        var startIdx = trimmed.IndexOf("<svg", StringComparison.OrdinalIgnoreCase);
        var endIdx = trimmed.LastIndexOf("</svg>", StringComparison.OrdinalIgnoreCase);
        if (startIdx < 0 || endIdx < startIdx)
        {
            return false;
        }

        var slice = trimmed.Substring(startIdx, endIdx - startIdx + "</svg>".Length);

        try
        {
            var settings = new System.Xml.XmlReaderSettings
            {
                DtdProcessing = System.Xml.DtdProcessing.Prohibit,
                XmlResolver = null
            };

            using var stringReader = new StringReader(slice);
            using var xmlReader = System.Xml.XmlReader.Create(stringReader, settings);
            var doc = XDocument.Load(xmlReader, LoadOptions.None);
            var root = doc.Root;
            if (root is null || !string.Equals(root.Name.LocalName, "svg", StringComparison.OrdinalIgnoreCase))
            {
                return false;
            }

            foreach (var element in doc.Descendants().ToList())
            {
                var name = element.Name.LocalName.ToLowerInvariant();
                if (name is "script" or "foreignobject" or "iframe" or "object" or "embed")
                {
                    element.Remove();
                    continue;
                }

                foreach (var attr in element.Attributes().ToList())
                {
                    if (attr.Name.LocalName.StartsWith("on", StringComparison.OrdinalIgnoreCase))
                    {
                        attr.Remove();
                        continue;
                    }

                    if (attr.Value.Contains("javascript:", StringComparison.OrdinalIgnoreCase) ||
                        attr.Value.Contains("vbscript:", StringComparison.OrdinalIgnoreCase))
                    {
                        attr.Remove();
                    }
                }
            }

            if (root.Attribute("xmlns") is null)
            {
                root.SetAttributeValue("xmlns", "http://www.w3.org/2000/svg");
            }

            if (root.Attribute("viewBox") is null)
            {
                root.SetAttributeValue("viewBox", "0 0 512 512");
            }

            sanitizedSvg = doc.ToString(SaveOptions.DisableFormatting);
            return true;
        }
        catch
        {
            return false;
        }
    }

    public static string ToSvgDataUri(string svgCode)
    {
        var bytes = Encoding.UTF8.GetBytes(svgCode);
        return $"data:image/svg+xml;base64,{Convert.ToBase64String(bytes)}";
    }

    public static string BuildFallbackSvg(string styleVariant, string? primaryGlowColor = null)
    {
        var glow = NormalizeHexColor(primaryGlowColor);
        var variant = (styleVariant ?? LoreRules.MangekyouVariants.Itachi).Trim().ToLowerInvariant();

        var patternMarkup = variant switch
        {
            LoreRules.MangekyouVariants.Sasuke => """
                <g filter="url(#uchihaGlow)">
                  <ellipse cx="256" cy="256" rx="148" ry="54" fill="none" stroke="#09090B" stroke-width="24" transform="rotate(0 256 256)" />
                  <ellipse cx="256" cy="256" rx="148" ry="54" fill="none" stroke="#09090B" stroke-width="24" transform="rotate(60 256 256)" />
                  <ellipse cx="256" cy="256" rx="148" ry="54" fill="none" stroke="#09090B" stroke-width="24" transform="rotate(120 256 256)" />
                  <ellipse cx="256" cy="256" rx="148" ry="54" fill="none" stroke="COLOR_GLOW" stroke-width="3" opacity="0.6" transform="rotate(0 256 256)" />
                  <ellipse cx="256" cy="256" rx="148" ry="54" fill="none" stroke="COLOR_GLOW" stroke-width="3" opacity="0.6" transform="rotate(60 256 256)" />
                  <ellipse cx="256" cy="256" rx="148" ry="54" fill="none" stroke="COLOR_GLOW" stroke-width="3" opacity="0.6" transform="rotate(120 256 256)" />
                </g>
                """,
            LoreRules.MangekyouVariants.Shisui => """
                <g filter="url(#uchihaGlow)">
                  <g transform="rotate(0 256 256)"><path d="M 256 256 L 236 168 L 256 96 L 288 158 Z" fill="#09090B" /></g>
                  <g transform="rotate(90 256 256)"><path d="M 256 256 L 236 168 L 256 96 L 288 158 Z" fill="#09090B" /></g>
                  <g transform="rotate(180 256 256)"><path d="M 256 256 L 236 168 L 256 96 L 288 158 Z" fill="#09090B" /></g>
                  <g transform="rotate(270 256 256)"><path d="M 256 256 L 236 168 L 256 96 L 288 158 Z" fill="#09090B" /></g>
                </g>
                """,
            LoreRules.MangekyouVariants.Obito => """
                <g filter="url(#uchihaGlow)">
                  <g transform="rotate(0 256 256)"><path d="M 256 218 C 330 205, 385 155, 342 98 C 330 140, 294 176, 256 184 Z" fill="#09090B" /></g>
                  <g transform="rotate(120 256 256)"><path d="M 256 218 C 330 205, 385 155, 342 98 C 330 140, 294 176, 256 184 Z" fill="#09090B" /></g>
                  <g transform="rotate(240 256 256)"><path d="M 256 218 C 330 205, 385 155, 342 98 C 330 140, 294 176, 256 184 Z" fill="#09090B" /></g>
                </g>
                """,
            LoreRules.MangekyouVariants.Madara => """
                <g filter="url(#uchihaGlow)">
                  <circle cx="256" cy="256" r="108" fill="none" stroke="#09090B" stroke-width="10" />
                  <g transform="rotate(0 256 256)"><circle cx="256" cy="146" r="28" fill="#09090B" /><path d="M 278 134 C 316 146, 336 180, 326 212 C 306 186, 282 170, 256 168 Z" fill="#09090B" /></g>
                  <g transform="rotate(120 256 256)"><circle cx="256" cy="146" r="28" fill="#09090B" /><path d="M 278 134 C 316 146, 336 180, 326 212 C 306 186, 282 170, 256 168 Z" fill="#09090B" /></g>
                  <g transform="rotate(240 256 256)"><circle cx="256" cy="146" r="28" fill="#09090B" /><path d="M 278 134 C 316 146, 336 180, 326 212 C 306 186, 282 170, 256 168 Z" fill="#09090B" /></g>
                </g>
                """,
            _ => """
                <g filter="url(#uchihaGlow)">
                  <g transform="rotate(0 256 256)"><path d="M 256 226 C 315 190, 355 130, 292 92 C 318 148, 284 188, 256 202 Z" fill="#09090B" /></g>
                  <g transform="rotate(120 256 256)"><path d="M 256 226 C 315 190, 355 130, 292 92 C 318 148, 284 188, 256 202 Z" fill="#09090B" /></g>
                  <g transform="rotate(240 256 256)"><path d="M 256 226 C 315 190, 355 130, 292 92 C 318 148, 284 188, 256 202 Z" fill="#09090B" /></g>
                </g>
                """
        };

        var resolvedPattern = patternMarkup.Replace("COLOR_GLOW", glow, StringComparison.Ordinal);

        return $"""
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="100%" height="100%">
              <defs>
                <radialGradient id="uchihaIrisGrad" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stop-color="#450A0A" />
                  <stop offset="45%" stop-color="{glow}" />
                  <stop offset="82%" stop-color="#991B1B" />
                  <stop offset="100%" stop-color="#09090B" />
                </radialGradient>
                <filter id="uchihaGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <circle cx="256" cy="256" r="250" fill="#09090B" />
              <circle cx="256" cy="256" r="236" fill="url(#uchihaIrisGrad)" stroke="#18181B" stroke-width="10" />
              <circle cx="256" cy="256" r="154" fill="none" stroke="#09090B" stroke-width="5" opacity="0.72" />
              <circle cx="256" cy="256" r="88" fill="none" stroke="#450A0A" stroke-width="3" opacity="0.65" />
              {resolvedPattern}
              <circle cx="256" cy="256" r="38" fill="#09090B" />
              <circle cx="256" cy="256" r="16" fill="{glow}" opacity="0.88" />
              <circle cx="256" cy="256" r="9" fill="#09090B" />
            </svg>
            """;
    }

    public static string NormalizeHexColor(string? color)
    {
        if (string.IsNullOrWhiteSpace(color))
        {
            return "#DC2626";
        }

        var trimmed = color.Trim();
        if (trimmed.Length == 7 &&
            trimmed[0] == '#' &&
            trimmed.Skip(1).All(Uri.IsHexDigit))
        {
            return trimmed.ToUpperInvariant();
        }

        return "#DC2626";
    }

    private static string StripMarkdownFences(string text)
    {
        var trimmed = text.Trim();
        if (trimmed.StartsWith("```", StringComparison.Ordinal))
        {
            var firstNewLine = trimmed.IndexOf('\n');
            if (firstNewLine >= 0)
            {
                trimmed = trimmed[(firstNewLine + 1)..];
            }

            if (trimmed.EndsWith("```", StringComparison.Ordinal))
            {
                trimmed = trimmed[..^3];
            }
        }

        return trimmed.Trim();
    }
}
