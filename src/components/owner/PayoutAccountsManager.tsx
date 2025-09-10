import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, CreditCard } from "lucide-react"
import { PhoneInputCI } from "@/components/ui/PhoneInputCI"
import { PayoutAccountCard } from "./PayoutAccountCard"
import { OtpDialog } from "./OtpDialog"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { useQuery, useQueryClient } from "@tanstack/react-query"

interface PayoutAccount {
  id: string
  label: string
  phone: string
  is_active: boolean
  payment_contact_id: string | null
}

interface Owner {
  id: string
  default_payout_account_id: string | null
}

export function PayoutAccountsManager() {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isOtpDialogOpen, setIsOtpDialogOpen] = useState(false)
  const [verificationId, setVerificationId] = useState<string>('')
  const [formData, setFormData] = useState({
    label: '',
    phone: ''
  })

  // Fetch payout accounts for current user only
  const { data: accounts, isLoading } = useQuery({
    queryKey: ['payout-accounts'],
    queryFn: async () => {
      // Get current user first
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Non authentifié')

      console.log('🔍 Current user ID:', user.id)

      // Get owner info for current user
      const { data: ownerData } = await supabase
        .from('owners')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (!ownerData) {
        console.log('⚠️ No owner found for user:', user.id)
        return [] // Return empty array instead of throwing error
      }

      console.log('✅ Owner found:', ownerData.id)

      // Fetch only payout accounts for this owner
      const { data, error } = await supabase
        .from('payout_accounts')
        .select('*')
        .eq('owner_id', ownerData.id)
        .order('is_active', { ascending: false })
      
      if (error) {
        console.error('❌ Error fetching payout accounts:', error)
        throw error
      }

      console.log('📊 Payout accounts found:', data?.length || 0)
      return data ? data.map((account: any) => ({
        ...account,
        payment_contact_id: account.cinetpay_contact_id
      })) as PayoutAccount[] : []
    },
    staleTime: 0, // Always refetch
    gcTime: 0 // Don't cache
  })

  // Fetch owner info
  const { data: owner } = useQuery({
    queryKey: ['owner-info'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Non authentifié')

      const { data, error } = await supabase
        .from('owners')
        .select('*')
        .eq('user_id', user.id)
        .single()
      
      if (error) throw error
      return data as Owner
    }
  })

  const handleSubmitForm = async () => {
    try {
      // Request OTP for phone validation
      const { data } = await supabase.functions.invoke('request-owner-otp', {
        body: { phone_payout: formData.phone }
      })

      if (data.success) {
        setVerificationId(data.verification_id)
        setIsOtpDialogOpen(true)
        setIsAddDialogOpen(false)
      } else {
        throw new Error(data.message || 'Erreur lors de l\'envoi de l\'OTP')
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message || "Impossible d'envoyer l'OTP"
      })
    }
  }

  const handleOtpVerified = async () => {
    try {
      // Get owner ID first
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Non authentifié')

      const { data: ownerData } = await supabase
        .from('owners')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (!ownerData) throw new Error('Compte propriétaire non trouvé')

      // Create payout account
      const { data, error } = await supabase
        .from('payout_accounts')
        .insert({
          owner_id: ownerData.id,
          label: formData.label,
          phone: formData.phone,
          is_active: true
        })
        .select()
        .single()

      if (error) throw error

      toast({
        title: "Compte ajouté",
        description: "Votre nouveau compte de paiement a été ajouté avec succès"
      })

      // Reset form
      setFormData({ label: '', phone: '' })
      setIsOtpDialogOpen(false)
      
      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['payout-accounts'] })
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message || "Impossible de créer le compte"
      })
    }
  }

  const handleSetDefault = async (accountId: string) => {
    try {
      const { error } = await supabase
        .from('owners')
        .update({ default_payout_account_id: accountId })
        .eq('id', owner?.id)

      if (error) throw error

      toast({
        title: "Compte par défaut mis à jour",
        description: "Ce compte sera utilisé par défaut pour vos nouveaux terrains"
      })

      queryClient.invalidateQueries({ queryKey: ['owner-info'] })
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message || "Impossible de définir le compte par défaut"
      })
    }
  }

  const refreshAccounts = () => {
    queryClient.invalidateQueries({ queryKey: ['payout-accounts'] })
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="space-y-2">
              <div className="h-20 bg-gray-200 rounded"></div>
              <div className="h-20 bg-gray-200 rounded"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Mes comptes de paiement
            </CardTitle>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter un numéro
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Ajouter un compte de paiement</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="label">Nom du compte</Label>
                    <Input
                      id="label"
                      placeholder="ex: Compte principal"
                      value={formData.label}
                      onChange={(e) => setFormData(prev => ({ ...prev, label: e.target.value }))}
                    />
                  </div>
                  <PhoneInputCI
                    id="phone"
                    label="Numéro Mobile Money"
                    value={formData.phone}
                    onChange={(value) => setFormData(prev => ({ ...prev, phone: value }))}
                  />
                  <Button 
                    onClick={handleSubmitForm} 
                    className="w-full"
                    disabled={!formData.label || !formData.phone}
                  >
                    Vérifier par SMS
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {accounts && accounts.length > 0 ? (
            <div className="grid gap-4">
              {accounts.map((account) => (
                <div key={account.id} className="relative">
                  <PayoutAccountCard
                    account={account}
                    isDefault={account.id === owner?.default_payout_account_id}
                    onUpdate={refreshAccounts}
                  />
                  {account.id !== owner?.default_payout_account_id && account.is_active && (
                    <div className="absolute top-4 right-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSetDefault(account.id)}
                      >
                        Définir par défaut
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Aucun compte configuré</h3>
              <p className="text-muted-foreground mb-4">
                Ajoutez votre premier numéro Mobile Money pour recevoir vos paiements
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <OtpDialog
        open={isOtpDialogOpen}
        onOpenChange={setIsOtpDialogOpen}
        onVerified={handleOtpVerified}
        phone={formData.phone}
      />
    </div>
  )
}