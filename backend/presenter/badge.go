package presenter

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// BadgeTier defines the prestige level of a badge
type BadgeTier string

const (
	TierBronze   BadgeTier = "bronze"
	TierSilver   BadgeTier = "silver"
	TierGold     BadgeTier = "gold"
	TierPlatinum BadgeTier = "platinum"
)

// BadgeCategory groups badges by type
type BadgeCategory string

const (
	CategoryMilestone   BadgeCategory = "milestone"
	CategoryPerformance BadgeCategory = "performance"
	CategorySpeed       BadgeCategory = "speed"
	CategoryConsistency BadgeCategory = "consistency"
	CategorySpecialty   BadgeCategory = "specialty"
)

// BadgeDefinition describes a type of badge that can be earned
type BadgeDefinition struct {
	ID          string        `json:"id"`
	Name        string        `json:"name"`
	Description string        `json:"description"`
	Icon        string        `json:"icon"`        // emoji or icon key
	Tier        BadgeTier     `json:"tier"`
	Category    BadgeCategory `json:"category"`
	Criteria    BadgeCriteria `json:"criteria"`
}

// BadgeCriteria defines the conditions to earn a badge
type BadgeCriteria struct {
	MinTestsCompleted  int     `json:"minTestsCompleted,omitempty"`
	MinAvgScore        float64 `json:"minAvgScore,omitempty"`
	MinScore           float64 `json:"minScore,omitempty"`        // single test threshold
	PerfectScores      int     `json:"perfectScores,omitempty"`   // tests with 100%
	PassStreak         int     `json:"passStreak,omitempty"`
	MaxTimeMinutes     int     `json:"maxTimeMinutes,omitempty"`  // speed badge
	MinPoints          int     `json:"minPoints,omitempty"`
	RequiredSubject    string  `json:"requiredSubject,omitempty"`
}

// Badge represents an earned badge instance for a student
type Badge struct {
	ID         primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	StudentID  string             `json:"studentId" bson:"studentId"`
	BadgeID    string             `json:"badgeId" bson:"badgeId"`
	Name       string             `json:"name" bson:"name"`
	Description string            `json:"description" bson:"description"`
	Icon       string             `json:"icon" bson:"icon"`
	Tier       BadgeTier          `json:"tier" bson:"tier"`
	Category   BadgeCategory      `json:"category" bson:"category"`
	EarnedAt   time.Time          `json:"earnedAt" bson:"earnedAt"`
	TestID     string             `json:"testId,omitempty" bson:"testId,omitempty"`
	TestTitle  string             `json:"testTitle,omitempty" bson:"testTitle,omitempty"`
	Score      float64            `json:"score,omitempty" bson:"score,omitempty"`
}

// CertificateData is the generated certificate payload (not persisted, generated on demand)
type CertificateData struct {
	StudentName  string    `json:"studentName"`
	StudentEmail string    `json:"studentEmail"`
	TestTitle    string    `json:"testTitle"`
	Score        float64   `json:"score"`
	Grade        string    `json:"grade"`
	CompletedAt  time.Time `json:"completedAt"`
	CertID       string    `json:"certId"` // deterministic: testId+studentId hash
}

// AllBadgeDefinitions is the complete badge catalogue
var AllBadgeDefinitions = []BadgeDefinition{
	// ── Milestone ──────────────────────────────────────────────────────────────
	{
		ID: "first_blood", Name: "First Blood", Tier: TierBronze, Category: CategoryMilestone,
		Description: "Completed your very first assessment.", Icon: "🎯",
		Criteria: BadgeCriteria{MinTestsCompleted: 1},
	},
	{
		ID: "on_a_roll", Name: "On a Roll", Tier: TierBronze, Category: CategoryMilestone,
		Description: "Completed 5 assessments.", Icon: "🔥",
		Criteria: BadgeCriteria{MinTestsCompleted: 5},
	},
	{
		ID: "centurion", Name: "Centurion", Tier: TierGold, Category: CategoryMilestone,
		Description: "Completed 10 assessments.", Icon: "⚡",
		Criteria: BadgeCriteria{MinTestsCompleted: 10},
	},
	// ── Performance ────────────────────────────────────────────────────────────
	{
		ID: "passing_grade", Name: "Passing Grade", Tier: TierBronze, Category: CategoryPerformance,
		Description: "Scored above 60% on an assessment.", Icon: "✅",
		Criteria: BadgeCriteria{MinScore: 60},
	},
	{
		ID: "honours", Name: "Honours", Tier: TierSilver, Category: CategoryPerformance,
		Description: "Scored above 80% on an assessment.", Icon: "🏅",
		Criteria: BadgeCriteria{MinScore: 80},
	},
	{
		ID: "distinction", Name: "Distinction", Tier: TierGold, Category: CategoryPerformance,
		Description: "Scored above 90% on an assessment.", Icon: "🏆",
		Criteria: BadgeCriteria{MinScore: 90},
	},
	{
		ID: "perfectionist", Name: "Perfectionist", Tier: TierPlatinum, Category: CategoryPerformance,
		Description: "Achieved a perfect 100% score.", Icon: "💎",
		Criteria: BadgeCriteria{MinScore: 100},
	},
	// ── Consistency ────────────────────────────────────────────────────────────
	{
		ID: "consistent", Name: "Consistent", Tier: TierSilver, Category: CategoryConsistency,
		Description: "Maintained an average score above 70% across all tests.", Icon: "📈",
		Criteria: BadgeCriteria{MinAvgScore: 70, MinTestsCompleted: 3},
	},
	{
		ID: "top_student", Name: "Top Student", Tier: TierGold, Category: CategoryConsistency,
		Description: "Maintained an average score above 85% across at least 5 tests.", Icon: "🌟",
		Criteria: BadgeCriteria{MinAvgScore: 85, MinTestsCompleted: 5},
	},
	{
		ID: "streak_3", Name: "Hat Trick", Tier: TierBronze, Category: CategoryConsistency,
		Description: "Passed 3 consecutive assessments.", Icon: "🎩",
		Criteria: BadgeCriteria{PassStreak: 3},
	},
	{
		ID: "streak_5", Name: "Unstoppable", Tier: TierSilver, Category: CategoryConsistency,
		Description: "Passed 5 consecutive assessments.", Icon: "🚀",
		Criteria: BadgeCriteria{PassStreak: 5},
	},
	// ── Speed ──────────────────────────────────────────────────────────────────
	{
		ID: "speed_demon", Name: "Speed Demon", Tier: TierSilver, Category: CategorySpeed,
		Description: "Completed an assessment in under 15 minutes with a passing score.", Icon: "⚡",
		Criteria: BadgeCriteria{MaxTimeMinutes: 15, MinScore: 60},
	},
}
