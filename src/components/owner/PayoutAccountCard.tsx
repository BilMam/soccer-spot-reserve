import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Smartphone, Trash2 } from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"

interface PayoutAccount {
  id: string
  label: string
  phone: string
  is_active: boolean
  cinetpay_contact_id: string | null
}

interface PayoutAccountCardProps {
  account: PayoutAccount
  isDefault?: boolean
  onUpdate: () => void
}


export function PayoutAccountCard({ account, isDefault, onUpdate }: PayoutAccountCardProps) {
  const { toast } = useToast()

  const handleToggleActive = async (active: boolean) => {
    try {
      const { error } = await supabase
        .from('payout_accounts')
        .update({ is_active: active })
        .eq('id', account.id)

      if (error) throw error

      toast({
        title: active ? "Compte activé" : "Compte désactivé",
        description: `Le compte ${account.label} a été ${active ? 'activé' : 'désactivé'}`
      })
      
      onUpdate()
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message || "Impossible de modifier le statut du compte"
      })
    }
  }

  const handleDelete = async () => {
    if (isDefault) {
      toast({
        variant: "destructive",
        title: "Impossible de supprimer",
        description: "Vous ne pouvez pas supprimer votre compte par défaut"
      })
      return
    }

    if (!confirm("Êtes-vous sûr de vouloir supprimer ce compte ?")) return

    try {
      const { error } = await supabase
        .from('payout_accounts')
        .delete()
        .eq('id', account.id)

      if (error) throw error

      toast({
        title: "Compte supprimé",
        description: `Le compte ${account.label} a été supprimé`
      })
      
      onUpdate()
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erreur",
        description: error.message || "Impossible de supprimer le compte"
      })
    }
  }

  const formatPhone = (phone: string) => {
    if (phone.startsWith('225')) {
      return `+225 ${phone.slice(3, 5)} ${phone.slice(5, 7)} ${phone.slice(7, 9)} ${phone.slice(9)}`
    }
    return phone
  }

  return (
    <Card className="relative">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              {account.label}
              {isDefault && (
                <Badge variant="default" className="text-xs">
                  Par défaut
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="flex items-center gap-2 mt-1">
              <Smartphone className="h-4 w-4" />
              {formatPhone(account.phone)}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={account.is_active}
              onCheckedChange={handleToggleActive}
              disabled={isDefault}
            />
            {!isDefault && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDelete}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent>        
        {account.cinetpay_contact_id && (
          <div className="mt-2">
            <Badge variant="outline" className="text-xs">
              Contact CinetPay configuré
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  )
}