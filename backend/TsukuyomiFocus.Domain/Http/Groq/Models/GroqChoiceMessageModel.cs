using System.Text.Json.Serialization;

namespace TsukuyomiFocus.Domain.Http.Groq.Models;

public sealed class GroqChoiceMessageModel
{
    [JsonPropertyName("role")]
    public string? Role { get; set; }

    [JsonPropertyName("content")]
    public string? Content { get; set; }
}
