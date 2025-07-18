import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { Loader2, CreditCard } from "lucide-react"

interface PayoutAccount {
  id: string
  label: string
  phone: string
  is_active: boolean
}

interface FieldPayoutAccountFormProps {
  payoutAccountId?: string
  onPayoutAccountChange: (accountId: string) => void
}

export default function FieldPayoutAccountForm({ 
  payoutAccountId, 
  onPayoutAccountChange 
}: FieldPayoutAccountFormProps) {
  const { data: accounts, isLoading } = useQuery({
    queryKey: ['payout-accounts-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payout_accounts')
        .select('id, label, phone, is_active')
        .eq('is_active', true)
        .order('label')
      
      if (error) throw error
      return data as PayoutAccount[]
    }
  })

  const formatPhone = (phone: string) => {
    if (phone.startsWith('225')) {
      return `+225 ${phone.slice(3, 5)} ${phone.slice(5, 7)} ${phone.slice(7, 9)} ${phone.slice(9)}`
    }
    return phone
  }

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Label>Compte de paiement</Label>
        <div className="flex items-center gap-2 h-10 px-3 border rounded-md">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm text-muted-foreground">Chargement des comptes...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="payout-account" className="flex items-center gap-2">
        <CreditCard className="h-4 w-4" />
        Compte de paiement
      </Label>
      
      <Select value={payoutAccountId || ''} onValueChange={onPayoutAccountChange}>
        <SelectTrigger id="payout-account">
          <SelectValue placeholder="Utiliser le compte par défaut" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">
            <div className="flex flex-col">
              <span>Compte par défaut</span>
              <span className="text-xs text-muted-foreground">
                Utilise votre compte de paiement principal
              </span>
            </div>
          </SelectItem>
          {accounts && accounts.map((account) => (
            <SelectItem key={account.id} value={account.id}>
              <div className="flex flex-col">
                <span>{account.label}</span>
                <span className="text-xs text-muted-foreground">
                  {formatPhone(account.phone)}
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      <p className="text-xs text-muted-foreground">
        Choisissez le compte Mobile Money qui recevra les paiements pour ce terrain.
        Si aucun n'est sélectionné, votre compte par défaut sera utilisé.
      </p>
    </div>
  )
}