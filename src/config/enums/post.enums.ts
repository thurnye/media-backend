export enum PostStatus {
  DRAFT = "draft",
  PENDING_APPROVAL = "pending_approval",
  APPROVED = "approved",
  SCHEDULED = "scheduled",
  PARTIALLY_PUBLISHED = "partially_published",
  PUBLISHED = "published",
  FAILED = "failed",
  ARCHIVED = "archived",
}

export enum PriorityLevel {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
}

export enum PostCategory {
  MARKETING = "marketing",
  EDUCATIONAL = "educational",
  PROMOTIONAL = "promotional",
  ANNOUNCEMENT = "announcement",
  ENGAGEMENT = "engagement",
  BRAND = "brand",
  COMMUNITY = "community",
  EVENT = "event",
  PRODUCT = "product",
  USER_GENERATED = "user_generated",
  TESTIMONIAL = "testimonial",
  BEHIND_THE_SCENES = "behind_the_scenes",
  SEASONAL = "seasonal",
  OTHER = "others",
}

// {
//   "workspaceId": "6997ed4fcac2735ab68271be",
//   "title": "my first non official post",
//   "description": "lorem ips",
//   "category": "others",
//   "tags": ["#startingout", "#we good"],
//   "priority": "low",
//   "isEvergreen": false
// }