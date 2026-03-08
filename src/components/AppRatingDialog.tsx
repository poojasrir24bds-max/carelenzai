import { useState, useEffect } from "react";
import { Star, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AppRatingDialogProps {
  userId: string;
  userCreatedAt: string; // ISO date string from user metadata
}

const APP_RATING_KEY = "app_rating_dismissed";
const APP_RATING_SUBMITTED_KEY = "app_rating_submitted";
const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

const AppRatingDialog = ({ userId, userCreatedAt }: AppRatingDialogProps) => {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [review, setReview] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Don't show if already submitted or dismissed today
    const submitted = localStorage.getItem(APP_RATING_SUBMITTED_KEY);
    if (submitted) return;

    const dismissed = localStorage.getItem(APP_RATING_KEY);
    if (dismissed) {
      const dismissedDate = new Date(dismissed);
      const now = new Date();
      // Don't show again for 7 days after dismissal
      if (now.getTime() - dismissedDate.getTime() < 7 * 24 * 60 * 60 * 1000) return;
    }

    // Check if account is 3+ days old
    const createdAt = new Date(userCreatedAt);
    const now = new Date();
    if (now.getTime() - createdAt.getTime() >= THREE_DAYS_MS) {
      // Small delay so it doesn't pop up immediately on load
      const timer = setTimeout(() => setOpen(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [userCreatedAt]);

  const handleDismiss = () => {
    localStorage.setItem(APP_RATING_KEY, new Date().toISOString());
    setOpen(false);
  };

  const handleSubmit = async () => {
    if (rating === 0) return;
    setSubmitting(true);

    const { error } = await supabase.from("app_ratings" as any).insert({
      user_id: userId,
      rating,
      review: review.trim() || null,
    } as any);

    if (error) {
      if (error.code === "23505") {
        toast({ title: "Already rated", description: "You've already rated the app. Thank you!" });
      } else {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      }
    } else {
      toast({ title: "Thank you for your feedback! 🎉" });
    }

    localStorage.setItem(APP_RATING_SUBMITTED_KEY, "true");
    setSubmitting(false);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleDismiss(); }}>
      <DialogContent className="sm:max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-center text-lg">How's your experience? 🌟</DialogTitle>
          <DialogDescription className="text-center text-sm">
            You've been using CareLenz AI for 3 days! We'd love your feedback.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-2">
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHover(star)}
                onMouseLeave={() => setHover(0)}
                className="p-1 transition-transform hover:scale-125"
              >
                <Star
                  className={`h-8 w-8 transition-colors ${
                    (hover || rating) >= star
                      ? "text-yellow-500 fill-yellow-500"
                      : "text-muted-foreground/30"
                  }`}
                />
              </button>
            ))}
          </div>
          {rating > 0 && (
            <p className="text-sm font-medium text-muted-foreground">
              {rating <= 2 ? "We'll do better! 💪" : rating <= 4 ? "Glad you like it! 😊" : "Awesome! 🎉"}
            </p>
          )}
          <Textarea
            placeholder="Tell us more (optional)"
            value={review}
            onChange={(e) => setReview(e.target.value)}
            rows={2}
            className="text-sm"
          />
          <div className="flex gap-2 w-full">
            <Button variant="outline" className="flex-1 rounded-xl" onClick={handleDismiss}>
              Later
            </Button>
            <Button className="flex-1 rounded-xl" onClick={handleSubmit} disabled={rating === 0 || submitting}>
              {submitting ? "Sending..." : "Submit"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AppRatingDialog;
