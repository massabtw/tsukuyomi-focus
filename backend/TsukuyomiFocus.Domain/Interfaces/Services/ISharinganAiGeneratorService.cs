using TsukuyomiFocus.Domain.ValueObjects;

namespace TsukuyomiFocus.Domain.Interfaces.Services;

public interface ISharinganAiGeneratorService
{
    Task<GeneratedSharinganResult> GenerateSharinganAsync(
        string? prompt,
        string? baseEyeImageBase64,
        string styleVariant,
        CancellationToken cancellationToken = default);
}
