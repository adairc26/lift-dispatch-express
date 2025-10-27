import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Header } from '@/components/Header';
import { useNavigate } from 'react-router-dom';
import { Truck, Package, Clock, Shield, Phone, MessageCircle } from 'lucide-react';

const Home = () => {
  const navigate = useNavigate();

  const services = [
    {
      icon: Truck,
      title: 'Crane Lift Services',
      description: 'Professional crane lift services for heavy equipment and materials',
      features: ['10-ton capacity', '15-ton capacity', 'Certified operators', 'Safe & insured'],
    },
    {
      icon: Package,
      title: 'Box Truck Delivery',
      description: 'Same-day box truck delivery for furniture, equipment, and materials',
      features: ['16ft & 24ft trucks', 'Same-day service', 'Load assistance', 'Local & regional'],
    },
  ];

  const benefits = [
    { icon: Clock, title: 'Fast Booking', text: 'Get instant estimates and book online' },
    { icon: Shield, title: 'Fully Insured', text: 'All jobs covered with comprehensive insurance' },
    { icon: Phone, title: '24/7 Support', text: 'Always available for urgent requests' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-primary to-primary-hover text-white py-20 md:py-32">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
              Need a crane or same-day box truck?
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-white/90">
              Book online — get a fast estimate and pick a time.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                size="lg" 
                variant="secondary"
                className="text-lg"
                onClick={() => navigate('/book')}
              >
                Book a Lift
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                className="text-lg bg-white/10 text-white border-white/30 hover:bg-white/20"
                onClick={() => navigate('/book')}
              >
                Request a Quote
              </Button>
            </div>
            <div className="mt-8 flex flex-col sm:flex-row gap-4 text-sm">
              <a 
                href="tel:+16042341234"
                className="flex items-center text-white/90 hover:text-white transition-colors"
              >
                <Phone className="mr-2 h-5 w-5" />
                Call: (604) 234-1234
              </a>
              <a 
                href="https://wa.me/16042341234"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center text-white/90 hover:text-white transition-colors"
              >
                <MessageCircle className="mr-2 h-5 w-5" />
                WhatsApp Us
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">Our Services</h2>
          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {services.map((service, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start mb-4">
                    <div className="p-3 bg-primary/10 rounded-lg mr-4">
                      <service.icon className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold mb-2">{service.title}</h3>
                      <p className="text-muted-foreground">{service.description}</p>
                    </div>
                  </div>
                  <ul className="space-y-2 mt-4">
                    {service.features.map((feature, i) => (
                      <li key={i} className="flex items-center text-sm">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary mr-2" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 bg-secondary/30">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">Why Choose Us</h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {benefits.map((benefit, index) => (
              <div key={index} className="text-center">
                <div className="inline-flex p-4 bg-primary/10 rounded-full mb-4">
                  <benefit.icon className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{benefit.title}</h3>
                <p className="text-muted-foreground">{benefit.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to Get Started?</h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Book your crane lift or box truck delivery in minutes. Get an instant estimate.
          </p>
          <Button size="lg" onClick={() => navigate('/book')}>
            Book Now
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2025 4Way Express Transportation. Serving Vancouver & Lower Mainland, BC, Canada.</p>
          <p className="mt-2">Professional crane lifts and box truck delivery services.</p>
        </div>
      </footer>
    </div>
  );
};

export default Home;