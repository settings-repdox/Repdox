import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Mail, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

interface EmailChangeModalProps {
  currentEmail: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EmailChangeModal({
  currentEmail,
  onClose,
  onSuccess,
}: EmailChangeModalProps) {
  const [newEmail, setNewEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleEmailChange() {
    if (!newEmail || newEmail === currentEmail) {
      setError("Please enter a different email address");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      setError("Please enter a valid email address");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        email: newEmail,
      });

      if (updateError) throw updateError;

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    } catch (err: any) {
      console.error("Email change error: ", err);
      setError(err.message || "Failed to update email");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X size={20} />
        </button>

        <div className="mb-6">
          <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-4">
            <Mail className="text-purple-600" size={24} />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Change Email
          </h2>
          <p className="text-gray-600 text-sm">
            You'll need to verify your new email address before you can use it
            to sign in.
          </p>
        </div>

        {success ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3 mb-6">
            <CheckCircle2
              className="text-green-600 flex-shrink-0 mt-0.5"
              size={20}
            />
            <div>
              <p className="text-sm font-medium text-green-800">
                Email update initiated!
              </p>
              <p className="text-xs text-green-700 mt-1">
                Check both your old and new email for confirmation links.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current Email
                </label>
                <Input
                  type="email"
                  value={currentEmail}
                  disabled
                  className="bg-gray-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Email
                </label>
                <Input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="your.new@email.com"
                  disabled={loading}
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2 mb-4">
                <AlertCircle
                  className="text-red-600 flex-shrink-0 mt-0.5"
                  size={16}
                />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                onClick={onClose}
                variant="outline"
                className="flex-1"
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleEmailChange}
                disabled={loading || !newEmail}
                className="flex-1 bg-gradient-to-r from-purple-600 to-cyan hover:from-purple-700 hover:to-cyan"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Email"
                )}
              </Button>
            </div>
          </>
        )}

        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <p className="text-xs text-blue-800">
            <strong>Note:</strong> You'll receive verification emails at both
            your old and new addresses. You must confirm the change to complete
            the update.
          </p>
        </div>
      </div>
    </div>
  );
}
