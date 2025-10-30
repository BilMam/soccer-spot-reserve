
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, Phone, Mail } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import { normalizePhoneE164 } from '@/utils/phoneHash';

type AuthMethod = 'email' | 'phone';

const Auth = () => {
  const [authMethod, setAuthMethod] = useState<AuthMethod>('email');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showOtpInput, setShowOtpInput] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [phoneForOtp, setPhoneForOtp] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    phone: '',
    fullName: '',
    confirmPassword: ''
  });
  
  const { signIn, signUp, signUpWithPhone, signInWithPhone, verifyOtp, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    const { error } = await signIn(formData.email, formData.password);
    
    if (error) {
      toast({
        title: "Erreur de connexion",
        description: error.message,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Connexion réussie",
        description: "Bienvenue sur PISport !"
      });
    }
    
    setIsLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Erreur",
        description: "Les mots de passe ne correspondent pas",
        variant: "destructive"
      });
      return;
    }
    
    setIsLoading(true);
    
    const { error } = await signUp(formData.email, formData.password, formData.fullName);
    
    if (error) {
      toast({
        title: "Erreur d'inscription",
        description: error.message,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Inscription réussie",
        description: "Vérifiez votre email pour confirmer votre compte"
      });
    }
    
    setIsLoading(false);
  };

  const handlePhoneAuth = async (e: React.FormEvent, mode: 'signup' | 'signin') => {
    e.preventDefault();
    setIsLoading(true);
    
    const e164Phone = normalizePhoneE164(formData.phone);
    if (!e164Phone) {
      toast({
        title: "Numéro invalide",
        description: "Veuillez entrer un numéro ivoirien valide",
        variant: "destructive"
      });
      setIsLoading(false);
      return;
    }
    
    const { error } = mode === 'signup' 
      ? await signUpWithPhone(e164Phone)
      : await signInWithPhone(e164Phone);
    
    if (error) {
      toast({
        title: mode === 'signup' ? "Erreur d'inscription" : "Erreur de connexion",
        description: error.message,
        variant: "destructive"
      });
      setIsLoading(false);
    } else {
      setPhoneForOtp(e164Phone);
      setShowOtpInput(true);
      toast({
        title: "Code envoyé !",
        description: "Vérifiez vos SMS pour le code de vérification"
      });
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    const { error } = await verifyOtp(phoneForOtp, otpCode);
    
    if (error) {
      toast({
        title: "Code invalide",
        description: error.message,
        variant: "destructive"
      });
      setIsLoading(false);
    } else {
      toast({
        title: "Connexion réussie",
        description: "Bienvenue sur PISport !"
      });
      // User will be redirected by useEffect
    }
  };

  if (showOtpInput) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="shadow-xl border-0">
            <CardHeader className="text-center pb-4">
              <CardTitle>Code de vérification</CardTitle>
              <CardDescription>
                Entrez le code à 6 chiffres envoyé au {phoneForOtp}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="otp">Code OTP</Label>
                  <Input
                    id="otp"
                    name="otp"
                    type="text"
                    placeholder="123456"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    maxLength={6}
                    required
                    className="text-center text-2xl tracking-widest"
                  />
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-green-600 hover:bg-green-700"
                  disabled={isLoading || otpCode.length !== 6}
                >
                  {isLoading ? "Vérification..." : "Vérifier"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setShowOtpInput(false);
                    setOtpCode('');
                    setPhoneForOtp('');
                  }}
                >
                  Retour
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <img src="/pisport-logo.png" alt="PISport" className="w-10 h-10" />
            <span className="text-2xl font-bold text-gray-900">PISport</span>
          </div>
          <p className="text-gray-600">Votre plateforme de réservation de terrains</p>
        </div>

        <Card className="shadow-xl border-0">
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="signin">Connexion</TabsTrigger>
              <TabsTrigger value="signup">Inscription</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <CardHeader className="text-center pb-4">
                <CardTitle>Bon retour !</CardTitle>
                <CardDescription>
                  Connectez-vous à votre compte pour réserver des terrains
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 mb-4">
                  <Button
                    type="button"
                    variant={authMethod === 'email' ? 'default' : 'outline'}
                    onClick={() => setAuthMethod('email')}
                    className="flex-1"
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Email
                  </Button>
                  <Button
                    type="button"
                    variant={authMethod === 'phone' ? 'default' : 'outline'}
                    onClick={() => setAuthMethod('phone')}
                    className="flex-1"
                  >
                    <Phone className="h-4 w-4 mr-2" />
                    Téléphone
                  </Button>
                </div>

                {authMethod === 'email' ? (
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="votre@email.com"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Mot de passe</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          name="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          value={formData.password}
                          onChange={handleInputChange}
                          required
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full bg-green-600 hover:bg-green-700"
                      disabled={isLoading}
                    >
                      {isLoading ? "Connexion..." : "Se connecter"}
                    </Button>
                  </form>
                ) : (
                  <form onSubmit={(e) => handlePhoneAuth(e, 'signin')} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone-signin">Numéro de téléphone</Label>
                      <Input
                        id="phone-signin"
                        name="phone"
                        type="tel"
                        placeholder="+225 07 07 07 07 07"
                        value={formData.phone}
                        onChange={handleInputChange}
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        Format: +225XXXXXXXX ou 0707070707
                      </p>
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full bg-green-600 hover:bg-green-700"
                      disabled={isLoading}
                    >
                      {isLoading ? "Envoi..." : "Recevoir le code"}
                    </Button>
                  </form>
                )}
              </CardContent>
            </TabsContent>

            <TabsContent value="signup">
              <CardHeader className="text-center pb-4">
                <CardTitle>Créer un compte</CardTitle>
                <CardDescription>
                  Rejoignez PISport et découvrez des terrains incroyables
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 mb-4">
                  <Button
                    type="button"
                    variant={authMethod === 'email' ? 'default' : 'outline'}
                    onClick={() => setAuthMethod('email')}
                    className="flex-1"
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Email
                  </Button>
                  <Button
                    type="button"
                    variant={authMethod === 'phone' ? 'default' : 'outline'}
                    onClick={() => setAuthMethod('phone')}
                    className="flex-1"
                  >
                    <Phone className="h-4 w-4 mr-2" />
                    Téléphone
                  </Button>
                </div>

                {authMethod === 'email' ? (
                  <form onSubmit={handleSignUp} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Nom complet</Label>
                      <Input
                        id="fullName"
                        name="fullName"
                        type="text"
                        placeholder="Jean Dupont"
                        value={formData.fullName}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email-signup">Email</Label>
                      <Input
                        id="email-signup"
                        name="email"
                        type="email"
                        placeholder="votre@email.com"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password-signup">Mot de passe</Label>
                      <Input
                        id="password-signup"
                        name="password"
                        type="password"
                        placeholder="••••••••"
                        value={formData.password}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
                      <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type="password"
                        placeholder="••••••••"
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        required
                      />
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full bg-green-600 hover:bg-green-700"
                      disabled={isLoading}
                    >
                      {isLoading ? "Inscription..." : "S'inscrire"}
                    </Button>
                  </form>
                ) : (
                  <form onSubmit={(e) => handlePhoneAuth(e, 'signup')} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone-signup">Numéro de téléphone</Label>
                      <Input
                        id="phone-signup"
                        name="phone"
                        type="tel"
                        placeholder="+225 07 07 07 07 07"
                        value={formData.phone}
                        onChange={handleInputChange}
                        required
                      />
                      <p className="text-xs text-muted-foreground">
                        Format: +225XXXXXXXX ou 0707070707
                      </p>
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full bg-green-600 hover:bg-green-700"
                      disabled={isLoading}
                    >
                      {isLoading ? "Envoi..." : "Recevoir le code"}
                    </Button>
                  </form>
                )}
              </CardContent>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
};

export default Auth;
