using System.Text.Json.Serialization;

namespace TsukuyomiFocus.Domain.Http.Groq.Models;

public sealed class GroqImageUrlModel
{
    [JsonPropertyName("url")]
    public string Url { get; set; } = string.Empty;
}
