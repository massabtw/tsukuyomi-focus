using TsukuyomiFocus.Domain.Exceptions;
using TsukuyomiFocus.Domain.ValueObjects;

namespace TsukuyomiFocus.Domain.Entities;

public class Mission
{
    public const int MaxTitleLength = 200;

    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Rank { get; set; } = LoreRules.Ranks.D;
    public string Status { get; set; } = LoreRules.MissionStatuses.Todo;
    public int EstimatedMinutes { get; set; } = 25;
    public int CompletedMinutes { get; set; }
    public int CompletedCycles { get; set; }
    public bool IsAmaterasu { get; set; }
    public DateOnly? AmaterasuDate { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? CompletedAt { get; set; }

    public static Mission Create(
        Guid userId,
        string? rawTitle,
        string? rawDescription,
        string? rawRank,
        int? rawEstimatedMinutes,
        bool isAmaterasu,
        bool userAlreadyHasAmaterasuToday,
        DateOnly today,
        DateTime nowUtc)
    {
        var (title, description, rank, estimatedMinutes) = ValidateAndNormalizeFields(
            rawTitle,
            rawDescription,
            rawRank,
            rawEstimatedMinutes);

        if (isAmaterasu && userAlreadyHasAmaterasuToday)
        {
            throw new DomainException(
                "As chamas negras do Amaterasu já ardem em uma missão hoje. Apenas uma missão Amaterasu é permitida por dia.",
                "AMATERASU_DAILY_LIMIT");
        }

        return new Mission
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Title = title,
            Description = description,
            Rank = rank,
            Status = LoreRules.MissionStatuses.Todo,
            EstimatedMinutes = estimatedMinutes,
            CompletedMinutes = 0,
            CompletedCycles = 0,
            IsAmaterasu = isAmaterasu,
            AmaterasuDate = isAmaterasu ? today : null,
            CreatedAt = nowUtc,
            CompletedAt = null
        };
    }

    public void UpdateDetails(
        string? rawTitle,
        string? rawDescription,
        string? rawRank,
        int? rawEstimatedMinutes)
    {
        var (title, description, rank, estimatedMinutes) = ValidateAndNormalizeFields(
            rawTitle,
            rawDescription,
            rawRank,
            rawEstimatedMinutes);

        Title = title;
        Description = description;
        Rank = rank;
        EstimatedMinutes = estimatedMinutes;
    }

    public void ChangeStatus(string? rawStatus, DateTime nowUtc)
    {
        var normalizedStatus = rawStatus?.Trim().ToLowerInvariant();
        if (!LoreRules.MissionStatuses.IsValid(normalizedStatus))
        {
            throw new DomainException(
                "Status inválido. Valores permitidos: 'todo', 'in_tsukuyomi', 'completed'.",
                "INVALID_STATUS");
        }

        Status = normalizedStatus!;
        CompletedAt = string.Equals(Status, LoreRules.MissionStatuses.Completed, StringComparison.Ordinal)
            ? CompletedAt ?? nowUtc
            : null;
    }

    public (bool IsAmaterasu, DateOnly? AmaterasuDate) DetermineAmaterasuToggle(
        bool? requestedState,
        bool otherAmaterasuExistsToday,
        DateOnly today)
    {
        if (string.Equals(Status, LoreRules.MissionStatuses.Completed, StringComparison.Ordinal))
        {
            throw new DomainException(
                "Não é possível invocar ou alterar as chamas do Amaterasu em uma missão já concluída.",
                "AMATERASU_COMPLETED_MISSION");
        }

        var targetState = requestedState ?? !IsAmaterasu;
        if (targetState && otherAmaterasuExistsToday)
        {
            throw new DomainException(
                "As chamas negras do Amaterasu já consomem outra missão hoje. Apenas uma missão Amaterasu pode ser selada por dia.",
                "AMATERASU_DAILY_LIMIT");
        }

        IsAmaterasu = targetState;
        AmaterasuDate = targetState ? today : null;
        return (IsAmaterasu, AmaterasuDate);
    }

    public void RecordCompletedCycle(int durationMinutes, bool markCompleted, DateTime nowUtc)
    {
        CompletedMinutes += durationMinutes;
        CompletedCycles += 1;

        if (markCompleted)
        {
            Status = LoreRules.MissionStatuses.Completed;
            CompletedAt ??= nowUtc;
        }
    }

    private static (string Title, string? Description, string Rank, int EstimatedMinutes) ValidateAndNormalizeFields(
        string? rawTitle,
        string? rawDescription,
        string? rawRank,
        int? rawEstimatedMinutes)
    {
        var title = rawTitle?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(title))
        {
            throw new DomainException("O título da missão é obrigatório.", "INVALID_TITLE");
        }

        if (title.Length > MaxTitleLength)
        {
            throw new DomainException(
                $"O título da missão deve ter no máximo {MaxTitleLength} caracteres.",
                "TITLE_TOO_LONG");
        }

        var rank = rawRank?.Trim().ToUpperInvariant();
        if (!LoreRules.Ranks.IsValid(rank))
        {
            throw new DomainException(
                "Rank inválido. Os Ranks permitidos são: D, C, B, A, S.",
                "INVALID_RANK");
        }

        var description = string.IsNullOrWhiteSpace(rawDescription) ? null : rawDescription.Trim();
        var estimatedMinutes = rawEstimatedMinutes is > 0
            ? rawEstimatedMinutes.Value
            : LoreRules.Ranks.Config[rank!].SuggestedMinutes;

        return (title, description, rank!, estimatedMinutes);
    }
}
