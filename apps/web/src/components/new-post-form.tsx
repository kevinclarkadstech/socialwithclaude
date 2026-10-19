import * as React from "react"
import {
  LISTING_BODY_MAX,
  LISTING_LOCATION_MAX,
  LISTING_TITLE_MAX,
  listingInput,
  POST_BODY_MAX,
  postBody,
  type ListingPriceType,
} from "@myapp/shared/types/posts"
import { monotonicFactory } from "ulid"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Textarea } from "@/components/ui/textarea"
import { api, apiErrorMessage } from "@/lib/api"

const ulid = monotonicFactory()

type FieldName = "body" | "title" | "priceCents" | "condition" | "location"
type FieldErrors = Partial<Record<FieldName, string>>

const PRICE_TYPES: { value: ListingPriceType; label: string }[] = [
  { value: "fixed", label: "Fixed price" },
  { value: "negotiable", label: "Negotiable" },
  { value: "free", label: "Free" },
  { value: "multiple", label: "Multiple items (see description)" },
]

/** "12.50" → 1250; "" or junk → undefined (the schema then asks for a price). */
function dollarsToCents(value: FormDataEntryValue | null) {
  const text = String(value ?? "")
    .replace(/[$,\s]/g, "")
    .trim()
  if (!/^\d+(\.\d{0,2})?$/.test(text)) return undefined
  return Math.round(Number(text) * 100)
}

/**
 * Create a post, or check "Sell this as a listing" to add a title, price,
 * condition and location (title and price are then required). Calls
 * `onCreated` with what was created.
 */
export function NewPostForm({
  onCreated,
}: {
  onCreated: (kind: "post" | "listing") => void
}) {
  const [isListing, setIsListing] = React.useState(false)
  const [priceType, setPriceType] = React.useState<ListingPriceType>("fixed")
  const [fieldErrors, setFieldErrors] = React.useState<FieldErrors>({})
  const [formError, setFormError] = React.useState<string | null>(null)
  const [pending, setPending] = React.useState(false)
  // One id per submission, reused if it's retried, so it's never created twice.
  const idRef = React.useRef<string | null>(null)

  const needsPrice = priceType === "fixed" || priceType === "negotiable"

  function showErrors(issues: { path: PropertyKey[]; message: string }[]) {
    const errors: FieldErrors = {}
    for (const issue of issues) {
      // A post's body is the whole input, so its issues have no path.
      const key = (issue.path[0] ?? "body") as FieldName
      errors[key] ??= issue.message
    }
    setFieldErrors(errors)
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const data = new FormData(form)

    setFormError(null)
    let create: (id: string) => Promise<unknown>
    if (isListing) {
      const parsed = listingInput.safeParse({
        body: data.get("body"),
        title: data.get("title"),
        priceType,
        priceCents: needsPrice ? dollarsToCents(data.get("price")) : null,
        condition: data.get("condition") || null,
        location: data.get("location"),
      })
      if (!parsed.success) return showErrors(parsed.error.issues)
      create = (id) => api.listings.createListing.mutate({ id, ...parsed.data })
    } else {
      const parsed = postBody.safeParse(data.get("body"))
      if (!parsed.success) return showErrors(parsed.error.issues)
      create = (id) => api.posts.createPost.mutate({ id, body: parsed.data })
    }
    setFieldErrors({})

    idRef.current ??= ulid()
    setPending(true)
    try {
      await create(idRef.current)
      idRef.current = null
      form.reset()
      setIsListing(false)
      setPriceType("fixed")
      onCreated(isListing ? "listing" : "post")
    } catch (err) {
      setFormError(
        apiErrorMessage(err) === "POSTING_DISABLED"
          ? "Posting is turned off right now."
          : "Couldn't post. Please try again."
      )
    } finally {
      setPending(false)
    }
  }

  const invalid = (name: FieldName) => (fieldErrors[name] ? true : undefined)

  return (
    <Card size="sm">
      <CardContent>
        <form onSubmit={handleSubmit} noValidate>
          <FieldGroup className="gap-4">
            <Field data-invalid={invalid("body")}>
              <FieldLabel htmlFor="post-body" className="sr-only">
                {isListing ? "Description" : "Post"}
              </FieldLabel>
              <Textarea
                id="post-body"
                name="body"
                placeholder={
                  isListing
                    ? "Describe what you're selling"
                    : "What's on your mind?"
                }
                maxLength={isListing ? LISTING_BODY_MAX : POST_BODY_MAX}
                aria-invalid={invalid("body")}
              />
              <FieldError>{fieldErrors.body}</FieldError>
            </Field>

            <Field orientation="horizontal">
              <Checkbox
                id="post-is-listing"
                checked={isListing}
                onCheckedChange={(checked) => {
                  setIsListing(checked)
                  setFieldErrors({})
                  // A retry id belongs to one kind; switching starts fresh.
                  idRef.current = null
                }}
              />
              <FieldLabel htmlFor="post-is-listing" className="font-normal">
                Sell this as a listing
              </FieldLabel>
            </Field>

            {isListing && (
              <ListingFields
                priceType={priceType}
                onPriceTypeChange={setPriceType}
                needsPrice={needsPrice}
                errors={fieldErrors}
              />
            )}

            <Field>
              {formError && <FieldError>{formError}</FieldError>}
              <Button type="submit" disabled={pending} className="self-end">
                {pending ? "Posting…" : isListing ? "List it" : "Post"}
              </Button>
            </Field>
          </FieldGroup>
        </form>
      </CardContent>
    </Card>
  )
}

function ListingFields({
  priceType,
  onPriceTypeChange,
  needsPrice,
  errors,
}: {
  priceType: ListingPriceType
  onPriceTypeChange: (priceType: ListingPriceType) => void
  needsPrice: boolean
  errors: FieldErrors
}) {
  const invalid = (name: FieldName) => (errors[name] ? true : undefined)

  return (
    <>
      <Field data-invalid={invalid("title")}>
        <FieldLabel htmlFor="listing-title">Title</FieldLabel>
        <Input
          id="listing-title"
          name="title"
          placeholder="e.g. Mountain bike, size M"
          maxLength={LISTING_TITLE_MAX}
          aria-invalid={invalid("title")}
          required
        />
        <FieldError>{errors.title}</FieldError>
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field>
          <FieldLabel htmlFor="listing-price-type">Price type</FieldLabel>
          <NativeSelect
            id="listing-price-type"
            value={priceType}
            onChange={(event) =>
              onPriceTypeChange(event.target.value as ListingPriceType)
            }
          >
            {PRICE_TYPES.map((option) => (
              <NativeSelectOption key={option.value} value={option.value}>
                {option.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        {needsPrice && (
          <Field data-invalid={invalid("priceCents")}>
            <FieldLabel htmlFor="listing-price">Price ($)</FieldLabel>
            <Input
              id="listing-price"
              name="price"
              inputMode="decimal"
              placeholder="0.00"
              aria-invalid={invalid("priceCents")}
              required
            />
            <FieldError>{errors.priceCents}</FieldError>
          </Field>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field>
          <FieldLabel htmlFor="listing-condition">Condition</FieldLabel>
          <NativeSelect id="listing-condition" name="condition" defaultValue="">
            <NativeSelectOption value="">Not specified</NativeSelectOption>
            <NativeSelectOption value="new">New</NativeSelectOption>
            <NativeSelectOption value="used">Used</NativeSelectOption>
          </NativeSelect>
        </Field>
        <Field data-invalid={invalid("location")}>
          <FieldLabel htmlFor="listing-location">Location</FieldLabel>
          <Input
            id="listing-location"
            name="location"
            placeholder="Optional"
            maxLength={LISTING_LOCATION_MAX}
            aria-invalid={invalid("location")}
          />
          <FieldError>{errors.location}</FieldError>
        </Field>
      </div>
    </>
  )
}
