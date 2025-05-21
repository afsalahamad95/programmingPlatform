package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Student struct {
	ID              primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	BasicInfo       BasicInfo          `json:"basicInfo" bson:"basicInfo"`
	TechnicalSkills TechnicalSkills    `json:"technicalSkills" bson:"technicalSkills"`
	Projects        []Project          `json:"projects" bson:"projects"`
	Achievements    []Achievement      `json:"achievements" bson:"achievements"`
	Certifications  []Certification    `json:"certifications" bson:"certifications"`
	CreatedAt       time.Time          `json:"createdAt" bson:"createdAt"`
	UpdatedAt       time.Time          `json:"updatedAt" bson:"updatedAt"`
}

type BasicInfo struct {
	Name            string `json:"name" bson:"name"`
	Email           string `json:"email" bson:"email"`
	GraduationYear  int    `json:"graduationYear" bson:"graduationYear"`
	Branch          string `json:"branch" bson:"branch"`
	University      string `json:"university" bson:"university"`
	CurrentSemester int    `json:"currentSemester" bson:"currentSemester"`
	Points          int    `json:"points" bson:"points"`
}

type TechnicalSkills struct {
	ProgrammingLanguages []string `json:"programmingLanguages" bson:"programmingLanguages"`
	Frameworks           []string `json:"frameworks" bson:"frameworks"`
	Tools                []string `json:"tools" bson:"tools"`
}

type Project struct {
	ID           string       `json:"id" bson:"id"`
	Name         string       `json:"name" bson:"name"`
	Role         string       `json:"role" bson:"role"`
	Technologies []string     `json:"technologies" bson:"technologies"`
	StartDate    string       `json:"startDate" bson:"startDate"`
	EndDate      string       `json:"endDate" bson:"endDate"`
	Description  string       `json:"description" bson:"description"`
	Links        ProjectLinks `json:"links" bson:"links"`
}

type ProjectLinks struct {
	Github string `json:"github,omitempty" bson:"github,omitempty"`
	Live   string `json:"live,omitempty" bson:"live,omitempty"`
}

type Achievement struct {
	ID          string `json:"id" bson:"id"`
	Title       string `json:"title" bson:"title"`
	Date        string `json:"date" bson:"date"`
	Description string `json:"description,omitempty" bson:"description,omitempty"`
}

type Certification struct {
	ID            string `json:"id" bson:"id"`
	Name          string `json:"name" bson:"name"`
	Provider      string `json:"provider" bson:"provider"`
	IssueDate     string `json:"issueDate" bson:"issueDate"`
	ExpiryDate    string `json:"expiryDate,omitempty" bson:"expiryDate,omitempty"`
	CredentialURL string `json:"credentialUrl,omitempty" bson:"credentialUrl,omitempty"`
}
