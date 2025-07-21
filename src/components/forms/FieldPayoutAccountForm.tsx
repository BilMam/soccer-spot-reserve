import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { useQuery } from "@tanstack/react-query"
import { supabase } from "@/integrations/supabase/client"
import { Loader2, CreditCard } from "lucide-react"
import { formatCI } from "@/utils/phone"

interface PayoutAccount {
  id: string
  label: string
  phone: string
  is_active: boolean
}

interface Owner {
  id: string
  default_payout_account_id: string | null
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

  const { data: owner, isLoading: ownerLoading } = useQuery({
    queryKey: ['owner-profile'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('owners')
        .select('id, default_payout_account_id')
        .single()
      
      if (error) throw error
      return data as Owner
    }
  })


  if (isLoading || ownerLoading) {
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

  // Si un seul compte actif, affichage simplifié
  if (accounts && accounts.length === 1) {
    const singleAccount = accounts[0]
    return (
      <div className="space-y-2">
        <Label className="flex items-center gap-2">
          <CreditCard className="h-4 w-4" />
          Compte de paiement
        </Label>
        <div className="flex items-center gap-2 p-3 border rounded-md bg-muted/50">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium">{singleAccount.label}</span>
              <Badge variant="secondary" className="text-xs">Par défaut</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{formatCI(singleAccount.phone)}</p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Ce compte Mobile Money recevra automatiquement les paiements pour ce terrain.
        </p>
      </div>
    )
  }

  // Cas avec plusieurs comptes
  const defaultAccount = accounts?.find(account => account.id === owner?.default_payout_account_id)
  
  return (
    <div className="space-y-2">
      <Label htmlFor="payout-account" className="flex items-center gap-2">
        <CreditCard className="h-4 w-4" />
        Compte de paiement
      </Label>
      
      <Select value={payoutAccountId || ''} onValueChange={onPayoutAccountChange}>
        <SelectTrigger id="payout-account">
          <SelectValue placeholder="Sélectionner un compte de paiement" />
        </SelectTrigger>
        <SelectContent>
          {accounts && accounts.map((account) => (
            <SelectItem key={account.id} value={account.id}>
              <div className="flex items-center justify-between w-full">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span>{account.label}</span>
                    {account.id === owner?.default_payout_account_id && (
                      <Badge variant="secondary" className="text-xs">Par défaut</Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatCI(account.phone)}
                  </span>
                </div>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      <p className="text-xs text-muted-foreground">
        Choisissez le compte Mobile Money qui recevra les paiements pour ce terrain.
        {defaultAccount && ` Le compte par défaut est "${defaultAccount.label}".`}
      </p>
    </div>
  )
}