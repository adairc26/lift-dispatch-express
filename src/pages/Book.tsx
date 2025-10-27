import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { CalendarIcon, ArrowLeft, ArrowRight, Truck, MapPin, FileText, DollarSign, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

type ServiceType = 'crane' | 'box_truck';

interface BookingFormData {
  serviceType: ServiceType | null;
  pickupAddress: string;
  pickupLat: number | null;
  pickupLng: number | null;
  dropoffAddress: string;
  dropoffLat: number | null;
  dropoffLng: number | null;
  preferredDate: Date | null;
  preferredTimeWindow: string;
  weightKg: string;
  dimensions: string;
  siteAccess: string;
  photos: string[];
}

const Book = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState<BookingFormData>({
    serviceType: null,
    pickupAddress: '',
    pickupLat: null,
    pickupLng: null,
    dropoffAddress: '',
    dropoffLat: null,
    dropoffLng: null,
    preferredDate: null,
    preferredTimeWindow: 'morning',
    weightKg: '',
    dimensions: '',
    siteAccess: '',
    photos: [],
  });

  const [estimate, setEstimate] = useState({
    base: 0,
    distanceFee: 0,
    weightSurcharge: 0,
    siteDifficultySurcharge: 0,
    total: 0,
    depositRequired: 0,
  });

  const calculateEstimate = () => {
    if (!formData.serviceType) return;

    // Base price in cents
    const base = formData.serviceType === 'crane' ? 30000 : 15000;

    // Distance calculation (would use Google Distance Matrix API in production)
    // For now, using placeholder
    const distanceKm = 15; // TODO: Integrate Google Distance Matrix API
    const distanceFee = Math.round(distanceKm * 250); // 250 cents per km = $2.50/km

    // Weight surcharge
    let weightSurcharge = 0;
    const weight = parseInt(formData.weightKg);
    if (weight && weight > 1000) {
      weightSurcharge = Math.round(((weight - 1000) / 100) * 500); // $5 per 100kg over 1000kg
    }

    // Site difficulty surcharge
    let siteDifficultySurcharge = 0;
    const siteAccessLower = formData.siteAccess.toLowerCase();
    if (siteAccessLower.includes('stairs')) siteDifficultySurcharge += 5000; // $50
    if (siteAccessLower.includes('narrow')) siteDifficultySurcharge += 3000; // $30

    const total = base + distanceFee + weightSurcharge + siteDifficultySurcharge;
    const depositRequired = Math.round(total * 0.20); // 20% deposit

    setEstimate({
      base,
      distanceFee,
      weightSurcharge,
      siteDifficultySurcharge,
      total,
      depositRequired,
    });
  };

  const handleNext = () => {
    if (step === 1 && !formData.serviceType) {
      toast.error('Please select a service type');
      return;
    }
    if (step === 2 && (!formData.pickupAddress || !formData.dropoffAddress || !formData.preferredDate)) {
      toast.error('Please fill in all address and date fields');
      return;
    }
    if (step === 3) {
      calculateEstimate();
    }
    setStep(step + 1);
  };

  const handleBack = () => {
    setStep(step - 1);
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error('Please sign in to complete your booking');
      navigate('/auth');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('bookings').insert({
        user_id: user.id,
        service_type: formData.serviceType,
        pickup_address: formData.pickupAddress,
        pickup_lat: formData.pickupLat,
        pickup_lng: formData.pickupLng,
        dropoff_address: formData.dropoffAddress,
        dropoff_lat: formData.dropoffLat,
        dropoff_lng: formData.dropoffLng,
        preferred_date: formData.preferredDate?.toISOString().split('T')[0],
        preferred_time_window: formData.preferredTimeWindow,
        weight_kg: formData.weightKg ? parseInt(formData.weightKg) : null,
        dimensions: formData.dimensions || null,
        site_access: formData.siteAccess || null,
        photos: formData.photos.length > 0 ? JSON.parse(JSON.stringify(formData.photos)) : null,
        estimated_price_cents: estimate.total,
        deposit_required_cents: estimate.depositRequired,
        status: 'pending',
      });

      if (error) throw error;

      toast.success('Booking requested! We\'ll confirm availability within 2 business hours.');
      navigate('/dashboard');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create booking');
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { number: 1, title: 'Service', icon: Truck },
    { number: 2, title: 'Addresses & Time', icon: MapPin },
    { number: 3, title: 'Job Details', icon: FileText },
    { number: 4, title: 'Quote & Payment', icon: DollarSign },
    { number: 5, title: 'Confirm', icon: CheckCircle },
  ];

  const progressPercentage = (step / steps.length) * 100;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          {/* Progress Indicator */}
          <div className="mb-8">
            <div className="flex justify-between mb-4">
              {steps.map((s) => (
                <div key={s.number} className="flex flex-col items-center">
                  <div
                    className={cn(
                      'w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-colors',
                      step >= s.number
                        ? 'bg-primary text-white'
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    <s.icon className="h-5 w-5" />
                  </div>
                  <span className={cn(
                    'text-xs font-medium hidden sm:block',
                    step >= s.number ? 'text-primary' : 'text-muted-foreground'
                  )}>
                    {s.title}
                  </span>
                </div>
              ))}
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>

          {/* Step Content */}
          <Card>
            <CardHeader>
              <CardTitle>
                {step === 1 && 'Select Service Type'}
                {step === 2 && 'Addresses & Schedule'}
                {step === 3 && 'Job Details & Photos'}
                {step === 4 && 'Review Quote'}
                {step === 5 && 'Confirm Booking'}
              </CardTitle>
              <CardDescription>
                {step === 1 && 'Choose between crane lift or box truck delivery'}
                {step === 2 && 'Enter pickup and dropoff locations and preferred date'}
                {step === 3 && 'Provide details about the job and upload photos'}
                {step === 4 && 'Review your instant estimate'}
                {step === 5 && 'Confirm your booking details'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Step 1: Service Type */}
              {step === 1 && (
                <RadioGroup
                  value={formData.serviceType || ''}
                  onValueChange={(value) => setFormData({ ...formData, serviceType: value as ServiceType })}
                >
                  <div className="grid gap-4">
                    <Label
                      htmlFor="crane"
                      className={cn(
                        'flex items-start space-x-3 p-4 border-2 rounded-lg cursor-pointer transition-colors',
                        formData.serviceType === 'crane'
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      )}
                    >
                      <RadioGroupItem value="crane" id="crane" />
                      <div className="flex-1">
                        <div className="font-semibold mb-1">Crane Lift Service</div>
                        <p className="text-sm text-muted-foreground">
                          Professional crane lifts for heavy equipment, HVAC units, rooftop installations, and materials
                        </p>
                        <p className="text-sm font-medium mt-2">Base Rate: CAD $300</p>
                      </div>
                    </Label>
                    
                    <Label
                      htmlFor="box_truck"
                      className={cn(
                        'flex items-start space-x-3 p-4 border-2 rounded-lg cursor-pointer transition-colors',
                        formData.serviceType === 'box_truck'
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      )}
                    >
                      <RadioGroupItem value="box_truck" id="box_truck" />
                      <div className="flex-1">
                        <div className="font-semibold mb-1">Box Truck Delivery</div>
                        <p className="text-sm text-muted-foreground">
                          Same-day box truck delivery for furniture, equipment, materials, and general cargo
                        </p>
                        <p className="text-sm font-medium mt-2">Base Rate: CAD $150</p>
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
              )}

              {/* Step 2: Addresses & Time */}
              {step === 2 && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="pickup">Pickup Address *</Label>
                    <Input
                      id="pickup"
                      placeholder="123 Main St, Vancouver, BC"
                      value={formData.pickupAddress}
                      onChange={(e) => setFormData({ ...formData, pickupAddress: e.target.value })}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="dropoff">Dropoff Address *</Label>
                    <Input
                      id="dropoff"
                      placeholder="456 Oak Ave, Burnaby, BC"
                      value={formData.dropoffAddress}
                      onChange={(e) => setFormData({ ...formData, dropoffAddress: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label>Preferred Date *</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            'w-full justify-start text-left font-normal',
                            !formData.preferredDate && 'text-muted-foreground'
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.preferredDate ? format(formData.preferredDate, 'PPP') : 'Pick a date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={formData.preferredDate || undefined}
                          onSelect={(date) => setFormData({ ...formData, preferredDate: date || null })}
                          disabled={(date) => date < new Date()}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div>
                    <Label htmlFor="timeWindow">Preferred Time Window</Label>
                    <RadioGroup
                      value={formData.preferredTimeWindow}
                      onValueChange={(value) => setFormData({ ...formData, preferredTimeWindow: value })}
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="morning" id="morning" />
                        <Label htmlFor="morning" className="font-normal cursor-pointer">Morning (8AM-12PM)</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="afternoon" id="afternoon" />
                        <Label htmlFor="afternoon" className="font-normal cursor-pointer">Afternoon (12PM-5PM)</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="flexible" id="flexible" />
                        <Label htmlFor="flexible" className="font-normal cursor-pointer">Flexible (Anytime)</Label>
                      </div>
                    </RadioGroup>
                  </div>
                </div>
              )}

              {/* Step 3: Job Details */}
              {step === 3 && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="weight">Estimated Weight (kg)</Label>
                    <Input
                      id="weight"
                      type="number"
                      placeholder="1000"
                      value={formData.weightKg}
                      onChange={(e) => setFormData({ ...formData, weightKg: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Weight over 1000 kg incurs an additional charge of $5 per 100 kg
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="dimensions">Dimensions (optional)</Label>
                    <Input
                      id="dimensions"
                      placeholder="e.g., 2m x 1.5m x 1m"
                      value={formData.dimensions}
                      onChange={(e) => setFormData({ ...formData, dimensions: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="siteAccess">Site Access Information</Label>
                    <Textarea
                      id="siteAccess"
                      placeholder="Describe access conditions: stairs, narrow paths, overhead wires, etc."
                      value={formData.siteAccess}
                      onChange={(e) => setFormData({ ...formData, siteAccess: e.target.value })}
                      rows={4}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Stairs: +$50 | Narrow access: +$30
                    </p>
                  </div>

                  <div>
                    <Label>Upload Photos (optional)</Label>
                    <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                      <p className="text-sm text-muted-foreground">
                        Photo upload feature coming soon. You can email photos to bookings@4wayexpress.com
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 4: Quote */}
              {step === 4 && (
                <div className="space-y-4">
                  <div className="bg-muted/50 p-6 rounded-lg space-y-3">
                    <div className="flex justify-between">
                      <span>Base Rate ({formData.serviceType === 'crane' ? 'Crane' : 'Box Truck'})</span>
                      <span className="font-semibold">CAD ${(estimate.base / 100).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Distance Fee (15 km × $2.50)</span>
                      <span className="font-semibold">CAD ${(estimate.distanceFee / 100).toFixed(2)}</span>
                    </div>
                    {estimate.weightSurcharge > 0 && (
                      <div className="flex justify-between">
                        <span>Weight Surcharge</span>
                        <span className="font-semibold">CAD ${(estimate.weightSurcharge / 100).toFixed(2)}</span>
                      </div>
                    )}
                    {estimate.siteDifficultySurcharge > 0 && (
                      <div className="flex justify-between">
                        <span>Site Difficulty Surcharge</span>
                        <span className="font-semibold">CAD ${(estimate.siteDifficultySurcharge / 100).toFixed(2)}</span>
                      </div>
                    )}
                    <div className="border-t pt-3 flex justify-between text-lg font-bold">
                      <span>Total Estimate</span>
                      <span className="text-primary">CAD ${(estimate.total / 100).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between bg-primary/10 -mx-6 -mb-6 mt-3 p-4 rounded-b-lg">
                      <span className="font-semibold">Deposit Required (20%)</span>
                      <span className="font-bold">CAD ${(estimate.depositRequired / 100).toFixed(2)}</span>
                    </div>
                  </div>
                  
                  <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg">
                    <p className="text-sm">
                      <strong>Note:</strong> This is an estimate. Final pricing will be confirmed by our dispatcher 
                      after reviewing your booking details and site conditions.
                    </p>
                  </div>
                </div>
              )}

              {/* Step 5: Confirm */}
              {step === 5 && (
                <div className="space-y-4">
                  <div className="bg-muted/30 p-6 rounded-lg space-y-4">
                    <div>
                      <h3 className="font-semibold mb-2">Service Type</h3>
                      <p className="text-muted-foreground">
                        {formData.serviceType === 'crane' ? 'Crane Lift Service' : 'Box Truck Delivery'}
                      </p>
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">Pickup</h3>
                      <p className="text-muted-foreground">{formData.pickupAddress}</p>
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">Dropoff</h3>
                      <p className="text-muted-foreground">{formData.dropoffAddress}</p>
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">Scheduled</h3>
                      <p className="text-muted-foreground">
                        {formData.preferredDate && format(formData.preferredDate, 'PPPP')} - {' '}
                        {formData.preferredTimeWindow === 'morning' && 'Morning (8AM-12PM)'}
                        {formData.preferredTimeWindow === 'afternoon' && 'Afternoon (12PM-5PM)'}
                        {formData.preferredTimeWindow === 'flexible' && 'Flexible (Anytime)'}
                      </p>
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">Total Estimate</h3>
                      <p className="text-2xl font-bold text-primary">CAD ${(estimate.total / 100).toFixed(2)}</p>
                      <p className="text-sm text-muted-foreground">Deposit: CAD ${(estimate.depositRequired / 100).toFixed(2)}</p>
                    </div>
                  </div>

                  <div className="bg-yellow-50 dark:bg-yellow-950/30 p-4 rounded-lg">
                    <p className="text-sm">
                      <strong>What happens next:</strong> Your booking will be marked as "Pending". 
                      We'll confirm availability within 2 business hours and send you an email and SMS notification.
                    </p>
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex justify-between pt-6">
                {step > 1 && (
                  <Button variant="outline" onClick={handleBack} disabled={loading}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                )}
                {step < 5 ? (
                  <Button onClick={handleNext} className="ml-auto">
                    Next
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <Button onClick={handleSubmit} disabled={loading} className="ml-auto">
                    {loading ? 'Submitting...' : 'Request Booking'}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Book;