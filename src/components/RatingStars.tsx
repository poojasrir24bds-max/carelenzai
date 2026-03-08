import { useState } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface RatingStarsProps {
  consultationId: string;
  ratedBy: string;
  ratedUser: string;
  existingRating?: number;
  existingReview?: string;
  readOnly?: boolean;
  onRated?: () => void;
}

const RatingStars = ({ consultationId, ratedBy, ratedUser, existingRating, existingReview, readOnly, onRated }: RatingStarsProps) => {
  const [rating, setRating] = useState(existingRating || 0);
  const [hover, setHover] = useState(0);
  const [review, setReview] = useState(existingReview || "");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(!!existingRating);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (rating === 0) return;
    setSubmitting(true);
    const { error } = await supabase.from("consultation_ratings" as any).insert({
      consultation_id: consultationId,
      rated_by: ratedBy,
      rated_user: ratedUser,
      rating,
      review: review.trim() || null,
    } as any);

    if (error) {
      if (error.code === "23505") {
        toast({ title: "Already rated", description: "You have already rated this consultation." });
      } else {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      }
    } else {
      toast({ title: "Rating submitted! ⭐" });
      setSubmitted(true);
      onRated?.();
    }
    setSubmitting(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={readOnly || submitted}
            onClick={() => !readOnly && !submitted && setRating(star)}
            onMouseEnter={() => !readOnly && !submitted && setHover(star)}
            onMouseLeave={() => !readOnly && !submitted && setHover(0)}
            className="p-0.5 transition-transform hover:scale-110 disabled:cursor-default"
          >
            <Star
              className={`h-5 w-5 transition-colors ${
                (hover || rating) >= star
                  ? "text-yellow-500 fill-yellow-500"
                  : "text-muted-foreground/30"
              }`}
            />
          </button>
        ))}
        {rating > 0 && <span className="text-xs text-muted-foreground ml-1">{rating}/5</span>}
      </div>
      {!readOnly && !submitted && (
        <>
          <Textarea
            placeholder="Write a review (optional)"
            value={review}
            onChange={(e) => setReview(e.target.value)}
            rows={2}
            className="text-xs"
          />
          <Button size="sm" className="rounded-xl text-xs" onClick={handleSubmit} disabled={rating === 0 || submitting}>
            {submitting ? "Submitting..." : "Submit Rating"}
          </Button>
        </>
      )}
      {submitted && existingReview && (
        <p className="text-xs text-muted-foreground italic">"{existingReview}"</p>
      )}
      {submitted && !existingReview && review && (
        <p className="text-xs text-muted-foreground italic">"{review}"</p>
      )}
    </div>
  );
};

export default RatingStars;

export const AverageRating = ({ rating, count }: { rating: number; count: number }) => (
  <div className="flex items-center gap-1">
    {[1, 2, 3, 4, 5].map((star) => (
      <Star
        key={star}
        className={`h-3.5 w-3.5 ${
          rating >= star ? "text-yellow-500 fill-yellow-500" : rating >= star - 0.5 ? "text-yellow-500 fill-yellow-500/50" : "text-muted-foreground/30"
        }`}
      />
    ))}
    <span className="text-xs text-muted-foreground ml-1">
      {rating > 0 ? `${rating.toFixed(1)} (${count})` : "No ratings"}
    </span>
  </div>
);
