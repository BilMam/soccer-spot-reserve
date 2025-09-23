import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"
import { Loader2 } from "lucide-react"
import { formatCI } from "@/utils/phone"

interface OtpDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  phone: string
  onVerified: () => void
}

export function OtpDialog({ open, onOpenChange, phone, onVerified }: OtpDialogProps) {
  const [otp, setOtp] = useState("")
  const [isVerifying, setIsVerifying] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const { toast } = useToast()

  // Countdown pour le renvoi d'OTP
  useEffect(() => {
    let timer: NodeJS.Timeout
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000)
    }
    return () => clearTimeout(timer)
  }, [countdown])

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      toast({
        variant: "destructive",
        title: "Code invalide",
        description: "Veuillez saisir un code à 6 chiffres"
      })
      return
    }

    setIsVerifying(true)
    
    try {
      // Simple OTP verification via Supabase Auth
      const { error } = await supabase.auth.verifyOtp({
        phone,
        token: otp,
        type: 'sms'
      })

      if (error) {
        console.error('OTP verification error:', error)
        throw new Error('Code OTP invalide ou expiré')
      }

      toast({
        title: "Code vérifié",
        description: "Votre code OTP a été vérifié avec succès"
      })
      
      onVerified()
      onOpenChange(false)
      
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur de vérification",
        description: error.message || "Code invalide ou expiré"
      })
      setOtp("")
    } finally {
      setIsVerifying(false)
    }
  }

  const handleResendOtp = async () => {
    setIsResending(true)
    
    try {
      const { data, error } = await supabase.functions.invoke('request-owner-otp', {
        body: { phone_payout: phone }
      })

      if (error) throw error

      if (data.success) {
        toast({
          title: "Code renvoyé",
          description: "Un nouveau code a été envoyé par SMS"
        })
        setCountdown(60) // 60 secondes avant pouvoir renvoyer
        setOtp("")
      } else {
        throw new Error(data.error || 'Erreur de renvoi')
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message || "Impossible de renvoyer le code"
      })
    } finally {
      setIsResending(false)
    }
  }


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Vérification du numéro</DialogTitle>
          <DialogDescription>
            Nous avons envoyé un code de vérification à 6 chiffres au numéro{" "}
            <span className="font-medium">{formatCI(phone)}</span>
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col items-center space-y-4 py-4">
          <InputOTP
            maxLength={6}
            value={otp}
            onChange={setOtp}
            disabled={isVerifying}
          >
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
            </InputOTPGroup>
            <InputOTPGroup>
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>
          
          <div className="text-center text-sm text-muted-foreground">
            Vous n'avez pas reçu le code ?{" "}
            <Button
              variant="link"
              className="p-0 h-auto"
              disabled={countdown > 0 || isResending}
              onClick={handleResendOtp}
            >
              {isResending ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                  Envoi...
                </>
              ) : countdown > 0 ? (
                `Renvoyer dans ${countdown}s`
              ) : (
                "Renvoyer le code"
              )}
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button
            onClick={handleVerifyOtp}
            disabled={otp.length !== 6 || isVerifying}
          >
            {isVerifying ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Vérification...
              </>
            ) : (
              "Vérifier"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}