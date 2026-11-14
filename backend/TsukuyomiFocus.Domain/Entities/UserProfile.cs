using TsukuyomiFocus.Domain.Exceptions;
using TsukuyomiFocus.Domain.ValueObjects;

namespace TsukuyomiFocus.Domain.Entities;

public readonly record struct FocusSessionOutcome(
    int ChakraEarned,
    bool UnlockedNewEyeStage,
    string? NewEyeStage,
    bool EyeRestored);

public class UserProfile
{
    public Guid Id { get; set; }
    public string Username { get; set; } = "Uchiha";
    public int TotalChakra { get; set; }
    public int TotalFocusMinutes { get; set; }
    public string CurrentEyeStage { get; set; } = LoreRules.EyeStages.Normal;
    public string EquippedEyeStage { get; set; } = LoreRules.EyeStages.Normal;
    public string MangekyouVariant { get; set; } = LoreRules.MangekyouVariants.Itachi;
    public string? CustomEyeImageUrl { get; set; }
    public int VisualBlurLevel { get; set; }
    public int CurrentStreak { get; set; }
    public int BestStreak { get; set; }
    public DateOnly? LastFocusDate { get; set; }
    public bool LeftEyeBlind { get; set; }
    public bool RightEyeBlind { get; set; }
    public int RestorationRequiredMinutes { get; set; } = LoreRules.IzanagiRestorationMinutes;
    public int RestorationProgressMinutes { get; set; }
    public DateOnly? LastIzanagiDate { get; set; }
    public int TotalIzanagiUsed { get; set; }
    public DateOnly? LastAmaterasuCheckDate { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public FocusSessionOutcome ApplyFocusSession(
        int durationMinutes,
        string? missionRank,
        bool isAmaterasu,
        bool wasSusanooActive,
        DateOnly today,
        DateTime nowUtc)
    {
        if (durationMinutes <= 0)
        {
            throw new DomainException(
                "A duração da sessão deve ser maior que zero minutos.",
                "INVALID_DURATION");
        }

        var chakraEarned = LoreRules.CalculateSessionChakra(
            durationMinutes,
            missionRank,
            isAmaterasu,
            wasSusanooActive);

        TotalChakra += chakraEarned;
        TotalFocusMinutes += durationMinutes;
        VisualBlurLevel = Math.Max(0, VisualBlurLevel - 1);

        UpdateStreakOnCompletion(today);
        var eyeRestored = ApplyEyeRestoration(durationMinutes);
        var (unlockedNewEyeStage, newEyeStage) = EvaluateEyeEvolution();
        UpdatedAt = nowUtc;

        return new FocusSessionOutcome(
            chakraEarned,
            unlockedNewEyeStage,
            unlockedNewEyeStage ? newEyeStage : null,
            eyeRestored);
    }

    public int ApplyAbandonPenalty(
        int durationMinutesElapsed,
        bool wasSusanooActive,
        bool useIzanagiToPreventPenalty,
        DateOnly today,
        DateTime nowUtc)
    {
        if (durationMinutesElapsed < 0)
        {
            throw new DomainException(
                "O tempo decorrido não pode ser negativo.",
                "INVALID_DURATION");
        }

        if (useIzanagiToPreventPenalty)
        {
            InvokeIzanagi(today, nowUtc);
            return 0;
        }

        VisualBlurLevel = Math.Min(LoreRules.MaxVisualBlurLevel, VisualBlurLevel + 1);
        var chakraPenaltyApplied = 0;

        if (wasSusanooActive)
        {
            var previousChakra = TotalChakra;
            TotalChakra = Math.Max(0, TotalChakra - LoreRules.SusanooBreakPenaltyChakra);
            chakraPenaltyApplied = previousChakra - TotalChakra;
        }

        UpdatedAt = nowUtc;
        return chakraPenaltyApplied;
    }

    public string InvokeIzanagi(DateOnly today, DateTime nowUtc)
    {
        if (LeftEyeBlind && RightEyeBlind)
        {
            throw new DomainException(
                "Ambos os olhos perderam a luz. Complete 180 minutos de restauração para invocar o Izanagi novamente.",
                "IZANAGI_BOTH_EYES_BLIND");
        }

        string blindedEye;
        if (!LeftEyeBlind)
        {
            LeftEyeBlind = true;
            blindedEye = "left";
        }
        else
        {
            RightEyeBlind = true;
            blindedEye = "right";
        }

        LastFocusDate = today;
        VisualBlurLevel = 0;
        LastIzanagiDate = today;
        TotalIzanagiUsed += 1;
        RestorationRequiredMinutes = LoreRules.IzanagiRestorationMinutes;
        UpdatedAt = nowUtc;

        return blindedEye;
    }

    public int ApplyAmaterasuPenalty(int expiredMissionsCount, DateOnly today, DateTime nowUtc)
    {
        if (expiredMissionsCount <= 0)
        {
            if (LastAmaterasuCheckDate != today)
            {
                LastAmaterasuCheckDate = today;
                UpdatedAt = nowUtc;
            }

            return 0;
        }

        var previousChakra = TotalChakra;
        var totalPenalty = (long)LoreRules.AmaterasuPenaltyChakra * expiredMissionsCount;
        TotalChakra = (int)Math.Max(0L, previousChakra - totalPenalty);
        LastAmaterasuCheckDate = today;
        UpdatedAt = nowUtc;

        return previousChakra - TotalChakra;
    }

    public (bool UnlockedNewStage, string CurrentStage) EvaluateEyeEvolution()
    {
        var previousStage = CurrentEyeStage;
        var evaluatedStage = LoreRules.EvaluateEyeEvolution(
            previousStage,
            TotalChakra,
            TotalFocusMinutes,
            CurrentStreak);

        var unlocked = !string.Equals(evaluatedStage, previousStage, StringComparison.Ordinal);
        if (unlocked)
        {
            CurrentEyeStage = evaluatedStage;
            EquippedEyeStage = evaluatedStage;
        }

        return (unlocked, CurrentEyeStage);
    }

    public void CustomizeEyes(
        string? equippedEyeStage,
        string? mangekyouVariant,
        string? customEyeImageUrl,
        bool clearCustomEyeImage,
        DateTime nowUtc)
    {
        if (equippedEyeStage is not null)
        {
            var normalizedStage = equippedEyeStage.Trim();
            if (!LoreRules.EyeStages.IsValid(normalizedStage))
            {
                throw new DomainException(
                    $"Estágio ocular '{equippedEyeStage}' inválido.",
                    "INVALID_EYE_STAGE");
            }

            var requestedOrder = LoreRules.EyeStages.Order[normalizedStage];
            var unlockedOrder = LoreRules.EyeStages.Order.GetValueOrDefault(CurrentEyeStage, 0);
            if (requestedOrder > unlockedOrder)
            {
                throw new DomainException(
                    $"O estágio ocular '{normalizedStage}' ainda não foi desbloqueado. Estágio atual: '{CurrentEyeStage}'.",
                    "EYE_STAGE_LOCKED");
            }

            EquippedEyeStage = normalizedStage;
        }

        if (mangekyouVariant is not null)
        {
            var normalizedVariant = mangekyouVariant.Trim();
            if (!LoreRules.MangekyouVariants.IsValid(normalizedVariant))
            {
                throw new DomainException(
                    $"Variante de Mangekyou '{mangekyouVariant}' inválida.",
                    "INVALID_MANGEKYOU_VARIANT");
            }

            MangekyouVariant = normalizedVariant;
        }

        if (clearCustomEyeImage)
        {
            CustomEyeImageUrl = null;
        }
        else if (customEyeImageUrl is not null)
        {
            var trimmedUrl = customEyeImageUrl.Trim();
            if (trimmedUrl.StartsWith("javascript:", StringComparison.OrdinalIgnoreCase) ||
                trimmedUrl.StartsWith("vbscript:", StringComparison.OrdinalIgnoreCase))
            {
                throw new DomainException(
                    "URL de imagem customizada inválida.",
                    "INVALID_CUSTOM_EYE_IMAGE_URL");
            }

            CustomEyeImageUrl = string.IsNullOrWhiteSpace(trimmedUrl) ? null : trimmedUrl;
        }

        UpdatedAt = nowUtc;
    }

    public void ApplyDevSimulation(
        int? addChakra,
        bool? unlockAllEyes,
        bool? resetBlindness,
        bool? simulateLeftEyeBlind,
        bool? simulateRightEyeBlind,
        int? setVisualBlurLevel,
        int? setCurrentStreak,
        DateTime nowUtc)
    {
        if (addChakra.HasValue)
        {
            TotalChakra = (int)Math.Clamp((long)TotalChakra + addChakra.Value, 0L, int.MaxValue);
        }

        if (setCurrentStreak.HasValue)
        {
            CurrentStreak = Math.Max(0, setCurrentStreak.Value);
            if (CurrentStreak > BestStreak)
            {
                BestStreak = CurrentStreak;
            }
        }

        if (setVisualBlurLevel.HasValue)
        {
            VisualBlurLevel = Math.Clamp(setVisualBlurLevel.Value, 0, LoreRules.MaxVisualBlurLevel);
        }

        if (resetBlindness == true)
        {
            LeftEyeBlind = false;
            RightEyeBlind = false;
            RestorationProgressMinutes = 0;
            RestorationRequiredMinutes = LoreRules.IzanagiRestorationMinutes;
        }

        if (simulateLeftEyeBlind.HasValue)
        {
            LeftEyeBlind = simulateLeftEyeBlind.Value;
        }

        if (simulateRightEyeBlind.HasValue)
        {
            RightEyeBlind = simulateRightEyeBlind.Value;
        }

        if (!LeftEyeBlind && !RightEyeBlind)
        {
            RestorationProgressMinutes = 0;
        }
        else if (RestorationRequiredMinutes <= 0)
        {
            RestorationRequiredMinutes = LoreRules.IzanagiRestorationMinutes;
        }

        EvaluateEyeEvolution();

        if (unlockAllEyes == true)
        {
            CurrentEyeStage = LoreRules.EyeStages.Rinnegan;
            EquippedEyeStage = LoreRules.EyeStages.Rinnegan;
        }

        UpdatedAt = nowUtc;
    }

    private void UpdateStreakOnCompletion(DateOnly today)
    {
        if (LastFocusDate == today)
        {
            if (CurrentStreak == 0)
            {
                CurrentStreak = 1;
            }
        }
        else if (LastFocusDate == today.AddDays(-1))
        {
            CurrentStreak += 1;
        }
        else
        {
            CurrentStreak = 1;
        }

        if (CurrentStreak > BestStreak)
        {
            BestStreak = CurrentStreak;
        }

        LastFocusDate = today;
    }

    private bool ApplyEyeRestoration(int completedMinutes)
    {
        if (!LeftEyeBlind && !RightEyeBlind)
        {
            return false;
        }

        RestorationProgressMinutes += completedMinutes;

        var required = RestorationRequiredMinutes > 0
            ? RestorationRequiredMinutes
            : LoreRules.IzanagiRestorationMinutes;

        if (RestorationProgressMinutes < required)
        {
            return false;
        }

        if (LeftEyeBlind)
        {
            LeftEyeBlind = false;
        }
        else if (RightEyeBlind)
        {
            RightEyeBlind = false;
        }

        RestorationProgressMinutes = 0;
        return true;
    }
}
