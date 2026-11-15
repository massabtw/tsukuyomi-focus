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
        var pattern = AnimeAccurateSharinganSvgBuilder.NormalizePatternType(null, styleVariant);
        var defaultBlades = AnimeAccurateSharinganSvgBuilder.GetDefaultBladeCount(pattern);

        return AnimeAccurateSharinganSvgBuilder.Build(
            patternType: pattern,
            bladeCount: defaultBlades,
            primaryCrimsonHex: primaryGlowColor,
            secondaryDarkHex: "#450A0A",
            hasAmaterasuFlames: false,
            rotationOffset: 0);
    }

    public static string SanitizeInnerSvgFragment(string? rawFragment)
    {
        if (string.IsNullOrWhiteSpace(rawFragment))
        {
            return string.Empty;
        }

        var trimmed = StripMarkdownFences(rawFragment);
        if (trimmed.Contains("<svg", StringComparison.OrdinalIgnoreCase))
        {
            var start = trimmed.IndexOf('>', trimmed.IndexOf("<svg", StringComparison.OrdinalIgnoreCase));
            var end = trimmed.LastIndexOf("</svg>", StringComparison.OrdinalIgnoreCase);
            if (start >= 0 && end > start)
            {
                trimmed = trimmed.Substring(start + 1, end - start - 1);
            }
        }

        var wrapped = $"<g xmlns=\"http://www.w3.org/2000/svg\">{trimmed}</g>";
        try
        {
            var settings = new System.Xml.XmlReaderSettings
            {
                DtdProcessing = System.Xml.DtdProcessing.Prohibit,
                XmlResolver = null
            };

            using var stringReader = new StringReader(wrapped);
            using var xmlReader = System.Xml.XmlReader.Create(stringReader, settings);
            var doc = XDocument.Load(xmlReader, LoadOptions.None);
            var root = doc.Root;
            if (root is null)
            {
                return string.Empty;
            }

            HashSet<string> allowedTags =
            [
                "g", "path", "polygon", "rect", "circle", "ellipse", "line", "polyline"
            ];

            foreach (var element in root.Descendants().ToList())
            {
                var name = element.Name.LocalName.ToLowerInvariant();
                if (!allowedTags.Contains(name))
                {
                    element.Remove();
                    continue;
                }

                foreach (var attr in element.Attributes().ToList())
                {
                    if (attr.Name.LocalName.StartsWith("on", StringComparison.OrdinalIgnoreCase) ||
                        attr.Name.LocalName.Equals("href", StringComparison.OrdinalIgnoreCase) ||
                        attr.Value.Contains("javascript:", StringComparison.OrdinalIgnoreCase) ||
                        attr.Value.Contains("vbscript:", StringComparison.OrdinalIgnoreCase))
                    {
                        attr.Remove();
                    }
                }
            }

            return string.Concat(root.Elements().Select(e => e.ToString(SaveOptions.DisableFormatting)));
        }
        catch
        {
            return string.Empty;
        }
    }

    public static string NormalizeHexColor(string? color, string fallback = "#DC2626")
    {
        if (string.IsNullOrWhiteSpace(color))
        {
            return fallback;
        }

        var trimmed = color.Trim();
        if (trimmed.Length == 7 &&
            trimmed[0] == '#' &&
            trimmed.Skip(1).All(Uri.IsHexDigit))
        {
            return trimmed.ToUpperInvariant();
        }

        if (trimmed.Length == 4 &&
            trimmed[0] == '#' &&
            trimmed.Skip(1).All(Uri.IsHexDigit))
        {
            return $"#{trimmed[1]}{trimmed[1]}{trimmed[2]}{trimmed[2]}{trimmed[3]}{trimmed[3]}".ToUpperInvariant();
        }

        return fallback;
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
