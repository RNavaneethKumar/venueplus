# =============================================================================
# VenuePlus — Docker Bake file
#
# Builds all images in parallel from the repo root in one command:
#   docker buildx bake
#
# To also push to Docker Hub:
#   docker buildx bake --push
#
# To build a specific target only:
#   docker buildx bake api
#   docker buildx bake pos
#
# Override POS build-time vars (baked into the Next.js bundle):
#   NEXT_PUBLIC_API_URL=https://api.yourvenueplus.io \
#   NEXT_PUBLIC_VENUE_ID=your-uuid \
#   NEXT_PUBLIC_TENANT_SLUG=yourvenue \
#   docker buildx bake --push
# =============================================================================

variable "REGISTRY"               { default = "rnavaneethkumar" }
variable "TAG"                    { default = "latest" }

variable "NEXT_PUBLIC_API_URL"    { default = "http://localhost:4000/api/v1" }
variable "NEXT_PUBLIC_VENUE_ID"   { default = "" }
variable "NEXT_PUBLIC_TENANT_SLUG" { default = "" }

# ── Build both images ─────────────────────────────────────────────────────────

group "default" {
  targets = ["api", "pos"]
}

# ── API image ─────────────────────────────────────────────────────────────────

target "api" {
  context    = "."
  dockerfile = "apps/api/Dockerfile"
  tags       = ["${REGISTRY}/venueplus-api:${TAG}"]
  platforms  = ["linux/amd64", "linux/arm64"]
}

# ── POS image ─────────────────────────────────────────────────────────────────

target "pos" {
  context    = "."
  dockerfile = "apps/pos/Dockerfile"
  tags       = ["${REGISTRY}/venueplus-pos:${TAG}"]
  platforms  = ["linux/amd64", "linux/arm64"]
  args = {
    NEXT_PUBLIC_API_URL     = NEXT_PUBLIC_API_URL
    NEXT_PUBLIC_VENUE_ID    = NEXT_PUBLIC_VENUE_ID
    NEXT_PUBLIC_TENANT_SLUG = NEXT_PUBLIC_TENANT_SLUG
  }
}
