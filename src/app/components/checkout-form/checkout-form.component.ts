import {Component, ElementRef, OnInit, ViewChild} from '@angular/core';
import {AddressesService} from "../../services/addresses.service";
import {CartStatusService} from "../../services/cart-status.service";
import {FormBuilder, FormGroup, Validators} from "@angular/forms";
import {Province} from "../../entities/addresses/province";
import {District} from "../../entities/addresses/district";
import {OrderItem} from "../../entities/purchase/order-item";
import {Address} from "../../entities/purchase/address";
import {Order} from "../../entities/purchase/order";
import {CartItem} from "../../entities/purchase/cart-item";
import {CheckoutService} from "../../services/checkout.service";
import {loadStripe, PaymentIntentResult, Stripe, StripeCardElement, StripeCardElementOptions} from "@stripe/stripe-js";
import {environment} from "../../../environments/environment.development";
import {PaymentInformation} from "../../entities/payment/payment-information";
import {JwtResponse} from "../../entities/register/jwt-response";
import {User} from "../../entities/user";
import {WebStorageService} from "../../services/web-storage.service";
import {Checkout} from "../../entities/purchase/checkout";
import {Customer} from "../../entities/purchase/customer";
import {FileService} from "../../services/file.service";

@Component({
  selector: 'app-checkout-form',
  templateUrl: './checkout-form.component.html',
  styleUrl: './checkout-form.component.css'
})
export class CheckoutFormComponent implements OnInit {

  // *** For component stripe payment
  private declare cardElement: StripeCardElement;
  private stripePromise: Promise<Stripe | null> = loadStripe(environment.stripePublicKey);
  private readonly cardOptions: StripeCardElementOptions = {
    style: {
      base: {
        iconColor: '#2f3ae8',
        color: '#000000',
        fontWeight: '500',
        fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
        fontSize: '25px'
      }
    },
    hidePostalCode: true,
  };

  protected totalPrice: number = 0.0
  protected totalQuantity: number = 0
  protected disablePurchase: boolean = true // for purchase bt

  @ViewChild('fileInput')
  protected fileInput!: ElementRef; // for reset
  protected declare file: File // for getting input type file
  protected declare user: User | null
  protected declare jwtResponse: JwtResponse

  protected declare form: FormGroup
  protected declare provinces: Province[]
  protected declare shippingAddressDistrict: District[]
  protected declare billingAddressDistrict: District[]
  protected checkPromptPayQRCode: boolean = false
  protected isCopy: boolean = false;

  // ** Popup
  protected iconMode: 'WARN' | 'ERROR' | 'CONFIRM' | 'SUCCESS' = 'ERROR';
  public visible: boolean = false;
  private statusConfirm: boolean = false;
  protected headerTitle: string = 'Checkout Failed';
  protected declare body: string;

  constructor(private readonly addressesService: AddressesService,
              private readonly cartStatusService: CartStatusService,
              private readonly checkoutService: CheckoutService,
              private readonly formBuilder: FormBuilder,
              private readonly webStorageService: WebStorageService,
              private readonly fileService: FileService) {
  }

  ngOnInit(): void {
    this.user = this.webStorageService.getUserFormToken()
    this.jwtResponse = this.webStorageService.getSession("jwtResponse");
    if (this.jwtResponse === null) {
      this.jwtResponse = new JwtResponse()
      this.jwtResponse.token = ''
    }
    this.loadCartStatus()
    this.loadAndListeningStripeElements()
    this.initialCheckoutFormGroup()
    this.initialAndSetDefaultAddresses()
  }

  private loadCartStatus(): void  {
    // subscribe to cart total price (subscribe works) when new event receive than make the assignment update ui
    this.cartStatusService.totalPrice.subscribe(response => (this.totalPrice = response))
    // subscribe to cart total quantity
    this.cartStatusService.totalQuantity.subscribe(response => (this.totalQuantity = response))
  }

  private loadAndListeningStripeElements(): void  {
    this.stripePromise.then((stripe: Stripe | null) => {
      // get handler to stripe element
      const elements = stripe?.elements()
      // create a cart elements and hind the zip code,set style cart it means debit,credit cart type
      this.cardElement = elements!.create('card', this.cardOptions)
      // add an instance of card UI component (mapped id)
      this.cardElement.mount('#card-element')
      // it's optional it will work if change event worked
      // Old way
      // this.cardElement.on('change', (event: any) => {
      //   if (event.complete) {
      //     this.disablePurchase = false
      //   } else {
      //     this.disablePurchase = true
      //   }
      // })
      // My new
      this.cardElement.on('change', (event: any) => (event.complete ? this.disablePurchase = false : this.disablePurchase = true)) // end on()
    }) // end then()
  }

  private initialCheckoutFormGroup(): void  {
    this.form = this.formBuilder.group({
      // Customer Form
      customer: this.formBuilder.group({
        firstname: [null, Validators.required],
        lastname: [null, Validators.required],
        email: [this.user?.username!, Validators.required], // note , Validators.email it didn't check domain name ex. abi@vsss can work
      }),
      // Shipping Address
      shippingAddress: this.formBuilder.group({
        street: [null, Validators.required],
        province: [null, Validators.required],
        district: [null, Validators.required],
        zipcode: [null, [Validators.required, Validators.maxLength(5)]]
      }),
      // Billing Address
      billingAddress: this.formBuilder.group({
        street: [null, Validators.required],
        province: [null, Validators.required],
        district: [null, Validators.required],
        zipcode: [null, [Validators.required, Validators.maxLength(5)]]
      })
    })
  }

  private initialAndSetDefaultAddresses(): void  {
    // get form groups
    const sForm = this.form.get('shippingAddress')
    const bForm = this.form.get('billingAddress')
    const firstIndex = 0
    this.addressesService.getProvinces().subscribe(response => {
      this.provinces = response
      const provinceName = this.provinces[firstIndex].name
      sForm?.get('province')?.setValue(provinceName)
      bForm?.get('province')?.setValue(provinceName)
      this.addressesService.getDistrictsByProvinceName(provinceName).subscribe(res => {
        this.shippingAddressDistrict = res
        this.billingAddressDistrict = res
        const districtName = this.shippingAddressDistrict[firstIndex].name
        sForm?.get('district')?.setValue(districtName)
        bForm?.get('district')?.setValue(districtName)
      })
    })
  }

  protected selectProvinceOnShippingAddress($event: any): void  {
    const form = this.form.get('shippingAddress')
    const name = form?.get('province')?.value
    this.addressesService.getDistrictsByProvinceName(name).subscribe(res => {
      this.shippingAddressDistrict = res
      form?.get('district')?.setValue(this.shippingAddressDistrict[0].name)
    })
  }

  protected selectProvinceOnBillingAddress($event: any): void  {
    const form = this.form.get('billingAddress')
    const name = form?.get('province')?.value
    this.addressesService.getDistrictsByProvinceName(name).subscribe(res => {
      this.billingAddressDistrict = res
      form?.get('district')?.setValue(this.billingAddressDistrict[0].name)
    })
  }

  protected copyShippingAddressToBillingAddress($event: any): void  {
    const shippingAddressValues = this.form.get('shippingAddress')?.value // get form -> get value of form
    if ($event.target.checked) { // if user clicked my checkbox <input type="checkbox" (change)="copyShippingAddressToBillingAddress($event)">
      this.isCopy = true
      this.form.get('billingAddress')?.setValue(shippingAddressValues) // set billingAddress for-req-purchase (Cloning) , now billingAddress === shippingAddress
      // *** update cities
      this.billingAddressDistrict = this.shippingAddressDistrict
    }
    else { // means cancel clicked
      this.isCopy = false
      this.form.get('billingAddress')?.reset()
      // bug fix for cities (clearing values)
      this.billingAddressDistrict = [] // for empty array
    }
  }

  protected uploadFileToAttr(event: any): void  {
    const file: File = event.target.files[0];
    if (file) {
      this.file = file
      this.disablePurchase = false
    }
  }

  protected checkout(): void  {
    this.visible = true
    this.iconMode = 'CONFIRM'
    this.headerTitle = 'Confirm Checkout'
    this.body = 'Are you already to purchase?'
  }

  // clear
  private processCheckoutByCard(): void  {
    let checkout
    checkout = this.getCheckout()
    checkout.order.statusPurchase = true
    checkout.order.dateCreated = new Date()
    checkout.order.qrPurchaseUrl = ""
    const optionPaymentMethod = {
      payment_method: {
        card: this.cardElement, // reference the stripe element component
        // importance for getting status succeeded when credit card was worked
        billing_details: {
          email: `${checkout.customer.email}`,
          name: `${checkout.customer.firstname} ${checkout.customer.lastname}`,
          address: {
            line1: checkout.billingAddress.street,
            city: `${checkout.billingAddress.province} ${checkout.billingAddress.district}`,
            country: 'TH', // can't thailand use only 2 char
            postal_code: `${checkout.billingAddress.zipcode}`
          }
        } // billing detail
      }  // payment method
    }
    const optionHandlerAction = {handleActions: false}
    const amount = Math.round(this.totalPrice * 100)
    const current = "THB"
    const email = checkout.customer.email
    const paymentInformation = new PaymentInformation(amount, current, email)
    this.checkoutService.createPaymentIntent(paymentInformation).subscribe(res => {
      this.stripePromise.then((stripe: Stripe | null) => {
        stripe?.confirmCardPayment(res.client_secret, optionPaymentMethod, optionHandlerAction).then((response: PaymentIntentResult) => {
          if (!response.error) {
            this.checkoutService.createCheckout(checkout!).subscribe(res => {
              if (res) {
                this.visible = true
                this.iconMode = 'SUCCESS'
                this.headerTitle = 'Checkout Successfully'
                this.body = 'Checkout By Card Successfully'
              }
            }, (errorResponse) => {
              this.visible = true
              this.iconMode = 'ERROR'
              this.headerTitle = 'Checkout Failed'
              this.body = errorResponse['message']
            })
          }
        }) //end confirmCardPayment(...)
      }, (errorResponse) => {
        this.visible = true
        this.iconMode = 'ERROR'
        this.headerTitle = 'Payment Function Failed'
        this.body = errorResponse['message']
      })
    }, (errorResponse) => {
      this.visible = true
      this.iconMode = 'ERROR'
      this.headerTitle = 'Create Payment Failed'
      this.body = errorResponse['message']
    })
  }

  private processCheckoutByQr(): void  {
    this.disablePurchase = false
    const checkout = this.getCheckout()
    checkout.order.statusPurchase = false
    // save qr then get path to checkout
    this.fileService.uploadQr(this.file).subscribe((res: { image: string, size: number, fullName: string }) => {
      checkout!.order.qrPurchaseUrl = res.image
      checkout!.order.dateCreated = new Date()
      this.checkoutService.createCheckout(checkout!).subscribe(res => {
          if (res) {
            this.visible = true
            this.iconMode = 'SUCCESS'
            this.headerTitle = 'Checkout Successfully'
            this.body = 'Checkout By PromptPay Successfully'
          }
        },
        (errorResponse) => { // Way to Catch Errors in Component
          this.visible = true
          this.iconMode = 'ERROR'
          this.headerTitle = 'Checkout Failed'
          this.body = errorResponse['error']['message']
        })
    }, (errorResponse) => { // case expity
      this.visible = true
      this.iconMode = 'ERROR'
      this.headerTitle = 'Upload Qr Failed'
      this.body = errorResponse['error']['message']
    })
  }

  private getCheckout(): Checkout {
    // sets up all entities of checkout
    const checkout = new Checkout()
    const shippingAddress = new Address()
    const billingAddress = new Address()
    const order = new Order()
    const customer = new Customer()

    const shippingAddressForm = this.form.get('shippingAddress')
    const shippingAddressFormValues = shippingAddressForm?.value
    shippingAddress.street = shippingAddressFormValues['street']
    shippingAddress.district = shippingAddressFormValues['district']
    shippingAddress.province = shippingAddressFormValues['province']
    shippingAddress.zipcode = shippingAddressFormValues['zipcode']

    const billingAddressForm = this.form.get('billingAddress')
    const billingAddressFormValues = billingAddressForm?.value
    billingAddress.street = billingAddressFormValues['street']
    billingAddress.district = billingAddressFormValues['district']
    billingAddress.province = billingAddressFormValues['province']
    billingAddress.zipcode = billingAddressFormValues['zipcode']

    const customerForm = this.form.get('customer')
    const customerFormValues = customerForm?.value
    customer.email = customerFormValues['email']
    customer.firstname = customerFormValues['firstname']
    customer.lastname = customerFormValues['lastname']

    checkout.billingAddress = billingAddress
    checkout.shippingAddress = shippingAddress
    checkout.customer = customer

    // get all cart items to array
    order.totalPrice = this.totalPrice
    order.totalQuantity = this.totalQuantity

    const cartItems: CartItem[] = this.cartStatusService.cartItems
    const orderItems: OrderItem[] = []

    for (let i = 0; i < cartItems.length; i++) {
      orderItems[i] = new OrderItem(cartItems[i])
    }

    checkout.orderItems = orderItems
    checkout.order = order
    return checkout
  }

  protected enablePromptPayQRCode(): void  {
    this.checkPromptPayQRCode = !this.checkPromptPayQRCode
    if (!this.checkPromptPayQRCode) {
      setTimeout(() => (this.loadAndListeningStripeElements()), 500) // have to delay for id on html tag
    }
  }

  private clearCart(): void  {
    // clear all attributes
    this.cartStatusService.cartItems = []
    this.cartStatusService.totalQuantity.next(0)
    this.cartStatusService.totalPrice.next(0)
    // for solve the bug , ex refresh after done checkout but cart not reset // **** update storage
    this.cartStatusService.persistCartItems() // have to set cartItems again now will be 0
    this.isCopy = false // unchecked copy mode
  }

  protected setCloseEvent(): void  {
    this.visible = false;
    if (this.iconMode === 'CONFIRM') {
      this.statusConfirm = false
    }
    if (this.body === 'Checkout By PromptPay Successfully') {
      this.onClearSuccessModeByQr()
    }
    if (this.body === 'Checkout By Card Successfully') {
      this.onClearSuccessModeByCard()
    }
  }

  protected setOkEvent(): void  {
    this.visible = false;
    if (this.iconMode === 'CONFIRM') {
      this.statusConfirm = true
      if (this.statusConfirm) {
        if (this.form.valid) { // valid form
          if (this.file) { // pay by qr
            this.processCheckoutByQr()
          }
          else if (!this.disablePurchase) { // pay by card
            this.processCheckoutByCard()
          }
        }
        else { // invalid form
          this.visible = true
          this.iconMode = 'WARN'
          this.headerTitle = 'Checkout Failed'
          this.body = 'Inputs are invalid'
        }
      }
    }
    if (this.body === 'Checkout By PromptPay Successfully') {
      this.onClearSuccessModeByQr()
    }
    if (this.body === 'Checkout By Card Successfully') {
      this.onClearSuccessModeByCard()
    }
  }

  private onClearSuccessModeByQr(): void  {
    this.form.reset()
    this.fileInput.nativeElement.value = null
    this.clearCart()
    this.disablePurchase = true
    this.initialAndSetDefaultAddresses()
  }

  private onClearSuccessModeByCard(): void  {
    this.form.reset()
    this.clearCart()
    this.loadAndListeningStripeElements()
    this.disablePurchase = true
    this.initialAndSetDefaultAddresses()
  }
}
