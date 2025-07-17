
import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import Layout from '@/components/Layout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Crown, 
  Users, 
  History, 
  Search, 
  Settings, 
  BarChart3, 
  Shield,
  Activity,
  TrendingUp,
  UserCheck,
  AlertTriangle
} from 'lucide-react';
import { UserManagementTab } from '@/components/super-admin/UserManagementTab';
import { AuditLogsTab } from '@/components/super-admin/AuditLogsTab';
import LoadingSpinner from '@/components/ui/loading-spinner';
import { Alert } from '@/components/ErrorBoundary';

const SuperAdminDashboard = () => {
  const { user } = useAuth();
  const { isSuperAdmin } = usePermissions();
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!user) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <Alert 
            type="error" 
            title="Accès non autorisé"
            message="Vous devez être connecté pour accéder à cette page."
          />
        </div>
      </Layout>
    );
  }

  if (!isSuperAdmin) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <Alert 
            type="warning" 
            title="Accès interdit"
            message="Seuls les Super Admins peuvent accéder à cette page."
          />
        </div>
      </Layout>
    ); 
  }

  // Mock stats - replace with real data
  const stats = [
    {
      title: "Utilisateurs Total",
      value: "2,547",
      change: "+12%",
      trend: "up",
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-50"
    },
    {
      title: "Propriétaires Actifs",
      value: "156",
      change: "+8%",
      trend: "up",
      icon: UserCheck,
      color: "text-green-600",
      bgColor: "bg-green-50"
    },
    {
      title: "Actions d'Audit",
      value: "1,234",
      change: "+23%",
      trend: "up",
      icon: Activity,
      color: "text-purple-600",
      bgColor: "bg-purple-50"
    },
    {
      title: "Alertes Sécurité",
      value: "3",
      change: "-50%",
      trend: "down",
      icon: AlertTriangle,
      color: "text-orange-600",
      bgColor: "bg-orange-50"
    }
  ];

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20">
        <div className="container mx-auto px-4 py-8">
          {/* Header Section */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-lg">
                  <Crown className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-foreground">Super Admin Dashboard</h1>
                  <p className="text-muted-foreground">Gestion complète du système Soccer Spot Reserve</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                  <Shield className="w-3 h-3 mr-1" />
                  Super Admin
                </Badge>
                <Button variant="outline" size="sm">
                  <Settings className="w-4 h-4 mr-2" />
                  Paramètres
                </Button>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {stats.map((stat, index) => (
                <Card key={index} className="soccer-card hover:shadow-lg transition-all duration-200">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                        <div className="flex items-center space-x-2 mt-2">
                          <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                          <Badge 
                            variant={stat.trend === 'up' ? 'default' : 'secondary'}
                            className={`text-xs ${stat.trend === 'up' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
                          >
                            <TrendingUp className={`w-3 h-3 mr-1 ${stat.trend === 'down' ? 'rotate-180' : ''}`} />
                            {stat.change}
                          </Badge>
                        </div>
                      </div>
                      <div className={`flex items-center justify-center w-12 h-12 rounded-lg ${stat.bgColor}`}>
                        <stat.icon className={`w-6 h-6 ${stat.color}`} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Search Bar */}
            <Card className="mb-6">
              <CardContent className="p-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Rechercher des utilisateurs, actions, logs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Tabs */}
          <Tabs defaultValue="users" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 lg:w-1/2">
              <TabsTrigger value="users" className="flex items-center space-x-2">
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline">Utilisateurs</span>
              </TabsTrigger>
              <TabsTrigger value="audit" className="flex items-center space-x-2">
                <History className="w-4 h-4" />
                <span className="hidden sm:inline">Audit</span>
              </TabsTrigger>
              <TabsTrigger value="analytics" className="flex items-center space-x-2">
                <BarChart3 className="w-4 h-4" />
                <span className="hidden sm:inline">Analytics</span>
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center space-x-2">
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">Config</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="users" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Users className="w-5 h-5" />
                    <span>Gestion des Utilisateurs</span>
                  </CardTitle>
                  <CardDescription>
                    Gérez les utilisateurs, leurs rôles et permissions dans le système
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <LoadingSpinner text="Chargement des utilisateurs..." />
                  ) : (
                    <UserManagementTab isSuperAdmin={isSuperAdmin} />
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="audit" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <History className="w-5 h-5" />
                    <span>Logs d'Audit</span>
                  </CardTitle>
                  <CardDescription>
                    Consultez l'historique complet des actions effectuées dans le système
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <LoadingSpinner text="Chargement des logs..." />
                  ) : (
                    <AuditLogsTab isSuperAdmin={isSuperAdmin} />
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <BarChart3 className="w-5 h-5" />
                    <span>Analytics du Système</span>
                  </CardTitle>
                  <CardDescription>
                    Visualisez les métriques et statistiques du système
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12">
                    <BarChart3 className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">Analytics à venir</h3>
                    <p className="text-muted-foreground">
                      Cette section contiendra des graphiques et métriques détaillées
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="settings" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Settings className="w-5 h-5" />
                    <span>Configuration Système</span>
                  </CardTitle>
                  <CardDescription>
                    Gérez les paramètres globaux et la configuration du système
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12">
                    <Settings className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">Configuration à venir</h3>
                    <p className="text-muted-foreground">
                      Cette section contiendra les paramètres système avancés
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
};

export default SuperAdminDashboard;
