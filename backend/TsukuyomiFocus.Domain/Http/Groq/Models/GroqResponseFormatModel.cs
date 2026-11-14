using System.Text.Json.Serialization;

namespace TsukuyomiFocus.Domain.Http.Groq.Models;

public sealed class GroqResponseFormatModel
{
    [JsonPropertyName("type")]
    public string Type { get; set; } = "json_object";
}
