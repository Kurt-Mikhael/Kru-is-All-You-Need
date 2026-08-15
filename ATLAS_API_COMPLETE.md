# Atlas API Complete Sandbox Guide

Dokumen gabungan untuk integrasi Atlas Sandbox, booking, payment, ancillary,
fulfilment, webhook, refund, void, dan UAT.

## 1. Environment

Gunakan Sandbox untuk development dan UAT.

```text
Sandbox base URL: https://sandbox.atriptech.com/
HTTP method: POST
Date format: YYYYMMDD
```

Jangan gunakan production URL dengan Sandbox credentials:

```text
Production search: https://search-sg.atriptech.com/
Production others: https://api-sg.atriptech.com/
```

Production hanya digunakan setelah UAT disetujui dan account diubah ke `LIVE`.

## 2. Credentials

Simpan credentials lokal di `.env`:

```dotenv
CLIENT_KEY=<sandbox-client-id>
SECRET_KEY=<sandbox-client-secret>
WEBHOOK=<webhook-url>
```

Jangan commit `.env`, mencetak secret ke log, atau mengirim credentials ke
frontend.

## 3. Standard Headers

Kirim header berikut pada setiap request:

```http
Content-Type: application/json
Accept: application/json
Accept-Encoding: gzip
x-atlas-client-id: <SANDBOX_CLIENT_ID>
x-atlas-client-secret: <SANDBOX_CLIENT_SECRET>
```

Sandbox tidak memakai MD5 signature, `timestamp`, atau header production
`client_id`/`signature`.

`Content-Encoding: gzip` tidak diperlukan untuk JSON biasa. `Accept-Encoding: gzip` hanya meminta response terkompresi bila didukung.

## 4. Date and Trip Rules

Format tanggal wajib tanpa dash:

```text
Correct: 20260915
Wrong:   2026-09-15
```

Trip type:

```text
1 = one-way
2 = round-trip
```

Jangan gunakan `"OW"` atau `"RT"` untuk `search.do`.

Round-trip membutuhkan `retDate`.

```json
{
  "tripType": 2,
  "fromCity": "DUR",
  "toCity": "CPT",
  "fromDate": "20260915",
  "retDate": "20260920",
  "adultNum": 2,
  "childNum": 1,
  "infantNum": 0,
  "currency": "USD"
}
```

Gunakan tanggal future menurut waktu server Atlas. `currency: USD` diperlukan
di Sandbox sampai settlement currency account dikonfigurasi.

## 5. Identifier Lifecycle

```text
search.do
  -> routingIdentifier

verify.do
  -> sessionId

order.do
  -> orderNo, pnrCode

pay.do
  -> ticketing

queryOrderDetails.do
  -> orderStatus, ticketStatus
```

Menurut dokumentasi:

- `routingIdentifier` berlaku maksimal 6 jam.
- `sessionId` berlaku maksimal 2 jam.

## 6. Search API

```http
POST https://sandbox.atriptech.com/search.do
```

Contoh DUR -> CPT:

```json
{
  "tripType": 1,
  "fromCity": "DUR",
  "toCity": "CPT",
  "fromDate": "20260915",
  "retDate": "",
  "adultNum": 1,
  "childNum": 0,
  "infantNum": 0,
  "currency": "USD"
}
```

Response sukses:

```json
{
  "status": 0,
  "msg": null,
  "routings": [
    {
      "routingIdentifier": "<ROUTING_IDENTIFIER>",
      "currency": "USD",
      "adultPrice": 33.08,
      "adultTax": 28.05,
      "fromSegments": [
        {
          "segmentIndex": 1,
          "carrier": "FA",
          "flightNumber": "FA171",
          "depAirport": "DUR",
          "arrAirport": "CPT"
        }
      ]
    }
  ]
}
```

Success ditentukan oleh `status: 0`, bukan HTTP `200` saja.

Ambil `routingIdentifier` dari routing yang dipilih. Jangan membuat routing
identifier atau flight number secara manual.

## 7. Verify API

```http
POST https://sandbox.atriptech.com/verify.do
```

Request:

```json
{
  "routingIdentifier": "<ROUTING_IDENTIFIER>",
  "maxResponseTime": 15000
}
```

Response penting:

```json
{
  "sessionId": "<SESSION_ID>",
  "maxSeats": 9,
  "status": 0,
  "msg": "success"
}
```

Gunakan `bookingRequirement` dari response verify untuk menyusun passenger
payload order.

## 8. Order API

```http
POST https://sandbox.atriptech.com/order.do
```

Request:

```json
{
  "sessionId": "<SESSION_ID>",
  "passengers": [
    {
      "name": "DOE/JOHN",
      "passengerType": 0,
      "gender": "M",
      "birthday": "19900101",
      "cardType": "PP",
      "cardNum": "A12345678",
      "cardIssuePlace": "US",
      "cardExpired": "20300101",
      "nationality": "US"
    }
  ],
  "contact": {
    "name": "DOE/JOHN",
    "email": "john.doe@example.com",
    "mobile": "0001-87291810"
  },
  "useAtlasMailForContact": false
}
```

Phone wajib menggunakan format `XXXX-XXXXXXXX`, contoh
`0001-87291810`.

Passenger type:

```text
0 = Adult
1 = Child
2 = Infant
```

Output utama:

```text
orderNo
pnrCode / airline PNR
totalPrice
currency
```

## 9. Query Order

```http
POST https://sandbox.atriptech.com/queryOrderDetails.do
```

Request:

```json
{
  "orderNo": "<ORDER_NO>"
}
```

Status penting:

| Field            | Value | Meaning                                     |
| ---------------- | ----: | ------------------------------------------- |
| `orderStatus`  | `1` | Processing / unpaid / ticketing in progress |
| `orderStatus`  | `2` | Completed                                   |
| `ticketStatus` | `0` | Not ticketed                                |
| `ticketStatus` | `1` | Ticket issued                               |

Payment `status: 0` belum berarti tiket sudah terbit. Poll query sampai:

```text
orderStatus: 2
ticketStatus: 1
```

## 10. Payment API

```http
POST https://sandbox.atriptech.com/pay.do
```

### 10.1 Deposit / Prepayment

```json
{
  "orderNo": "<ORDER_NO>",
  "paymentMethod": 1
}
```

### 10.2 VCC

```json
{
  "orderNo": "<ORDER_NO>",
  "paymentMethod": 3,
  "creditCard": {
    "cardHolderFirstName": "John",
    "cardHolderLastName": "Doe",
    "cardNumber": "4111111111111111",
    "cardExpireYear": "2030",
    "cardExpireMonth": "01",
    "cardCVV": "123",
    "cardType": "VI"
  }
}
```

`paymentMethod: 3` tanpa `creditCard` menghasilkan `creditCard is required`.

## 11. Fulfilment API

Fulfilment bypasses `verify.do`:

```text
getOfferPrice.do
  -> offerID
  -> order.do with offerId
  -> pay.do
  -> queryOrderDetails.do
```

### 11.1 Get Offer Price

```http
POST https://sandbox.atriptech.com/getOfferPrice.do
```

Search terlebih dahulu dan gunakan schedule aktual dari response. Pada Sandbox,
flight number harus dikirim tanpa prefix carrier.

```json
{
  "adults": 1,
  "childNum": 0,
  "infantNum": 0,
  "outboundSegments": [
    {
      "departureAirport": "DUR",
      "arrivalAirport": "CPT",
      "flightNumber": "171",
      "departureDate": "20260915",
      "carrier": "FA"
    }
  ],
  "currency": "USD"
}
```

Terbukti:

```text
FA171 -> status 116, airline error
171   -> status 0, offer returned
```

Ambil:

```text
data[0].offer.offerID
```

### 11.2 Fulfilment Order

```json
{
  "offerId": "<OFFER_ID>",
  "passengers": [
    {
      "name": "DOE/FULFIL",
      "passengerType": 0,
      "gender": "M",
      "birthday": "19900101",
      "cardType": "PP",
      "cardNum": "C12345678",
      "cardIssuePlace": "US",
      "cardExpired": "20300101",
      "nationality": "US"
    }
  ],
  "contact": {
    "name": "DOE/FULFIL",
    "email": "fulfil@example.com",
    "mobile": "0001-87291810"
  },
  "useAtlasMailForContact": false
}
```

## 12. Price Compare Search

Untuk crawling dan raw price discovery:

```http
POST https://sandbox.atriptech.com/priceCompareSearch.do
```

Request:

```json
{
  "requestId": "crawl-dur-cpt-001",
  "tripType": "1",
  "adultNum": 1,
  "childNum": 0,
  "infantNum": 0,
  "fromCity": "DUR",
  "toCity": "CPT",
  "fromDate": "20260915",
  "includeMultipleFareFamily": false,
  "currency": "USD"
}
```

Endpoint dapat memberi `noResultReason` dan `recentFlightDates`, tetapi account
yang diuji belum memiliki permission:

```text
status: 900
The current client is not allowed to access this API
```

## 13. In-booking Baggage

Baggage dapat dikirim saat `order.do` memakai `ancillaries`.

```json
{
  "sessionId": "<SESSION_ID>",
  "passengers": [
    {
      "name": "DOE/JOHN",
      "passengerType": 0,
      "ancillaries": [
        {
          "productCode": "SCI_BAG_15KG",
          "segmentIndex": 1
        },
        {
          "productCode": "SCI_BAG_15KG",
          "segmentIndex": 2
        }
      ]
    }
  ],
  "contact": {
    "name": "DOE/JOHN",
    "email": "john.doe@example.com",
    "mobile": "0001-87291810"
  },
  "useAtlasMailForContact": false
}
```

Untuk connecting route, satu product code dapat wajib dikirim pada semua
segment.

## 14. Seat Selection

### 14.1 Seat Availability

```http
POST https://sandbox.atriptech.com/seatAvailability.do
```

Request:

```json
{
  "sessionId": "<SESSION_ID_DARI_VERIFY>"
}
```

Pilih seat dengan:

```text
seatStatus: F
```

Contoh ancillary:

```json
{
  "productCode": "SCI_SEAT_4B_6E_COK_DEL",
  "segmentIndex": 1
}
```

Jika order menghasilkan `status: 320`, seat sudah diambil. Ulangi verify dan
seat availability, lalu pilih product code free terbaru.

## 15. Post-ticketing Baggage

Fitur ini digunakan setelah main ticket sudah issued.

### 15.1 Search Post-ticketing Baggage

```http
POST https://sandbox.atriptech.com/postBookingAncillarySearch.do
```

Request:

```json
{
  "ticketOrderNo": "<MAIN_ORDER_NO>",
  "ancillaryCategory": "BAGGAGE"
}
```

Ambil:

```text
sessionId
ancillaryProductElements[].productCode
ancillaryProductElements[].segmentIndex
ancillaryProductElements[].canPurchasePostTicket
```

Jangan mengirim product code yang tidak dikembalikan response. Product `20KG`
atau `30KG` tidak boleh diasumsikan tersedia.

### 15.2 Order Post-ticketing Baggage

```http
POST https://sandbox.atriptech.com/postBookingAncillaryOrder.do
```

Request connecting yang terverifikasi:

```json
{
  "sessionId": "<SESSION_ID_TERBARU>",
  "ancillaryCategory": "BAGGAGE",
  "ticketOrderNo": "<MAIN_ORDER_NO>",
  "passengers": [
    {
      "name": "DOE/JOHN",
      "passengerType": 0,
      "ancillaries": [
        {
          "productCode": "SCI_BAG_3PC_15KG",
          "segmentIndex": 1
        },
        {
          "productCode": "SCI_BAG_3PC_15KG",
          "segmentIndex": 2
        }
      ]
    }
  ]
}
```

Response harus menghasilkan order baru dengan `orderType: 6`.

### 15.3 Pay Ancillary Order

```json
{
  "orderNo": "<ANCILLARY_ORDER_NO>",
  "paymentMethod": 1
}
```

Poll `queryOrderDetails.do` sampai ancillary order ticketed.

Post-ticketing rules:

- Main order harus sudah ticketed.
- Passenger name harus identik dengan main ticket.
- Connecting flight dapat membutuhkan ancillary pada semua segment.
- Tidak tersedia dalam 24 jam sebelum departure.
- Tidak berlaku untuk infant.
  Ancillary order tetap berada di `orderStatus: 1` / `ticketStatus: 0` selama
  ticketing. Jangan pay ulang atau regenerate; polling sampai `ticketStatus: 1`.

## 16. Regenerate Order

Digunakan untuk unpaid order yang masih valid.

```http
POST https://sandbox.atriptech.com/regenerateOrder.do
```

Request:

```json
{
  "originalOrderNo": "<UNPAID_ORDER_NO>"
}
```

Response menghasilkan `orderNo` baru. Bayar order baru, bukan order lama.

## 17. Refund

### 17.1 Refund Quotation

```http
POST https://sandbox.atriptech.com/refundQuotation.do
```

Untuk connecting ticket, `refundRequestList` harus memuat passenger dan seluruh
segment dengan detail asli dari order:

```json
{
  "orderNo": "<ORDER_NO>",
  "refundRequestList": [
    {
      "ticketNo": "<TICKET_NO>",
      "name": "DOE/JOHN",
      "passengerType": 0,
      "segments": [
        {
          "segmentIndex": 1,
          "depDate": "20260915",
          "arrDate": "20260915",
          "depAirport": "COK",
          "arrAirport": "DEL",
          "flightNo": "6E2706",
          "carrier": "6E"
        },
        {
          "segmentIndex": 2,
          "depDate": "20260916",
          "arrDate": "20260916",
          "depAirport": "DEL",
          "arrAirport": "DXB",
          "flightNo": "6E1461",
          "carrier": "6E"
        }
      ]
    }
  ]
}
```

Ambil `refundOfferId` dan cek `isRefundable`.

### 17.2 Execute Refund

```http
POST https://sandbox.atriptech.com/refund.do
```

```json
{
  "orderNo": "<ORDER_NO>",
  "refundOfferId": "<REFUND_OFFER_ID>"
}
```

Ambil `refundCode`.

### 17.3 Query Refund

```http
POST https://sandbox.atriptech.com/queryRefundOrders.do
```

```json
{
  "orderNo": "<ORDER_NO>",
  "refundCode": "<REFUND_CODE>"
}
```

Refund status:

```text
0 = Atlas processing
1 = Airline processing
2 = Refunded
4 = Rejected
```

## 18. Void

### 18.1 Void Quotation

```http
POST https://sandbox.atriptech.com/voidQuotation.do
```

```json
{
  "orderNo": "<ORDER_NO>"
}
```

Ambil `voidOfferId`, `isVoidable`, dan `voidWindow`.

### 18.2 Execute Void

```http
POST https://sandbox.atriptech.com/void.do
```

```json
{
  "orderNo": "<ORDER_NO>",
  "voidOfferId": "<VOID_OFFER_ID>"
}
```

Ambil `voidCode`.

### 18.3 Query Void

```http
POST https://sandbox.atriptech.com/queryVoidOrders.do
```

```json
{
  "orderNo": "<ORDER_NO>",
  "voidCode": "<VOID_CODE>"
}
```

Void dan refund berlaku untuk full order, bukan sebagian passenger.

## 19. Webhook

### 19.1 Register Webhook

```http
POST https://sandbox.atriptech.com/updateWebhookURL.do
```

```json
{
  "url": "<WEBHOOK_URL>"
}
```

Webhook harus dapat diakses Atlas dan handler harus idempotent.

`updateWebhookURL.do` hanya mengonfirmasi URL berhasil didaftarkan. Verifikasi
payload event tetap harus dilakukan di webhook receiver atau webhook.site.

Event yang mungkin diterima:

```text
order.ticketed
schedule changed
void completed
refund completed
```

Test terverifikasi:

```text
updateWebhookURL.do: status 0
Order: TESTA20260814163931149
orderStatus: 2
ticketStatus: 1
```

Setelah order mencapai `ticketStatus: 1`, webhook event `order.ticketed`
dikirim ke URL terdaftar. Sebelum ticketing, order masih `TktInProcess`.

## 20. UAT Reference Routes

| Module                 | Route          | Scenario                       |
| ---------------------- | -------------- | ------------------------------ |
| Flight Booking         | `AMS -> MAA` | 1 adult, one-way, connection   |
| Flight Booking         | `DUR -> CPT` | 2 adults + 1 child, round-trip |
| VCC                    | `PUS -> CJU` | 1 adult, one-way               |
| In-booking baggage     | `BOM -> IXR` | 1 adult                        |
| Seat selection         | `COK -> DXB` | 1 adult                        |
| Post-ticketing baggage | `ELQ -> HMB` | SM, connecting ancillary       |

## 21. Verified Sandbox Results

### Flight Booking

```text
AMS -> MAA, 1 adult, one-way
Order: TESTA20260814161142264
PNR: XVNEDA
Total: USD 210.44
```

```text
DUR -> CPT, 2 adults + 1 child, round-trip
Order: TESTA20260814161142950
PNR: AYXBBU
Total: USD 310.44
```

### VCC

```text
PUS -> CJU
Order: TESTA20260814162214435
PNR: QBVXAU
Payment method: 3
Total: USD 37.22
Final: orderStatus=2, ticketStatus=1
```

Order VCC ini kemudian digunakan untuk smoke test void. Jangan gunakan sebagai
order aktif setelah void selesai.

### In-booking Baggage

```text
BOM -> IXR
Order: TESTA20260814162304120
PNR: UGVYEF
Ancillary total: USD 292.44
Final: orderStatus=2, ticketStatus=1
```

### Seat Selection

```text
COK -> DXB
Order: TESTA20260814162334779
PNR: XYYYAD
Seat: SCI_SEAT_4B_6E_COK_DEL
Seat price: USD 15.23
Final: orderStatus=2, ticketStatus=1
```

### Fulfilment

```text
DUR -> CPT
Offer flow order: TESTA20260814164025196
PNR: BNSPV1
Total: USD 61.13
Final: orderStatus=2, ticketStatus=1
```

### Regenerate

```text
Original unpaid: TESTA20260814162820143
Regenerated: TESTA20260814162827472
```

Order hasil regenerate harus dibayar dan dipoll sampai `orderStatus=2` dan
`ticketStatus=1`; bayar order baru, bukan order lama.

### Post-ticketing Baggage

```text
Main order: TESTA20260814162854980
Main PNR: GEIW90
Ancillary order: TESTB20260814164508794
Product: SCI_BAG_3PC_15KG on segments 1 and 2
Ancillary total: USD 89.88
orderType: 6
Final: orderStatus=2, ticketStatus=1
```

Ancillary order sempat berada di `orderStatus=1` (`TktInProcess`) beberapa
saat setelah pay; polling sampai `ticketStatus=1` dengan `orderType=6`,
ancillary, dan main-order linkage sesuai request awal.

### Refund

```text
Order: TESTA20260814162334779
Refund code: 202608-0021
Refund status: 0
Estimated refund: USD 176.86
```

### Void

```text
Order: TESTA20260814162214435
Void code: 202608-0020
Void status: 0
```

## 22. Common Errors

### Status 900: authentication

```text
The current API requires specific permissions, yet authentication information is missing for this request
```

Periksa Sandbox URL dan header `x-atlas-*`.

### Status 900: Price Compare permission

```text
The current client is not allowed to access this API
```

Minta permission Price Compare dari Atlas.

### Status 102: trip type

```text
Trip type (tripType) can only be 1 (one-way) or 2 (round trip)
```

Gunakan angka `1` atau `2`.

### Status 102: date

```text
Can not search past flights
```

Gunakan format `YYYYMMDD` dan tanggal future.

### Status 116: fulfilment

```text
airline error: 5000-null
```

Ambil flight number dari Search. Pada Sandbox, coba nomor tanpa prefix carrier.

### Status 320: seat

```text
Selected seats unavailable. Re-run verify.do and select different seats.
```

Ulangi verify dan seat availability.

### Status 503: post-ticketing baggage

```text
Incorrect baggage selection. Verify baggage type and allowance for this airline.
```

Pastikan passenger identik, product berasal dari response terbaru, dan semua
segment connecting dikirim bila diwajibkan.

### Status 307: ancillary segment mismatch

```text
illegal booking request param: Ancillaries not equal to the number of segments(outbound)
```

Untuk connecting flight, kirim satu ancillary pada setiap segment yang diminta
Atlas. Product code harus sama jika response ancillary search memberikan product
yang sama untuk semua segment.

### Status 410: contact phone

```text
Use the correct format "XXXX-XXXXXXXX" for contact phone.
```

Gunakan contoh format Sandbox:

```text
0001-87291810
```

### Status 318: duplicate booking

```text
Duplicate booking: same passenger + flight already exists. Query orders before rebooking.
```

Gunakan routing berbeda atau query order yang sudah ada. Jangan membuat order
duplikat untuk passenger dan flight yang sama.

### Status 400: VCC credit card required

```text
creditCard is required
```

`paymentMethod: 3` memerlukan object `creditCard` lengkap. Field yang terbukti
diperlukan:

```text
cardHolderFirstName
cardHolderLastName
cardNumber
cardExpireYear
cardExpireMonth
cardCVV
cardType
```

### Status 810: refund request list

```text
illegal request param: refundRequestList is required
```

Refund quotation dapat memerlukan `refundRequestList` berisi passenger, ticket
number, dan seluruh detail segment asli.

### Status 8041: refund segment mismatch

```text
Segment not found in this order. Verify segment details match the original booking.
```

Gunakan `depDate`, `arrDate`, airport, `flightNo`, carrier, dan segment index
langsung dari `queryOrderDetails.do`. Jangan mengarang detail segment.

### Post-ticketing order state

Post-ticketing flow menggunakan dua order berbeda:

```text
Main flight order: orderType=1, ticketOrderNo=<MAIN_ORDER_NO>
Ancillary order: orderType=6, orderNo=<ANCILLARY_ORDER_NO>
```

`ticketOrderNo` dipakai saat `postBookingAncillarySearch.do`; `orderNo` baru
dipakai saat membayar dan query ancillary order.

### Payment and ticketing are asynchronous

```text
pay.do status=0
query orderStatus=1, ticketStatus=0
query orderStatus=2, ticketStatus=1
```

Payment sukses hanya berarti pembayaran diterima. Ticketing harus diverifikasi
melalui polling `queryOrderDetails.do`.

### PNR after ticketing

PNR dari `order.do` belum selalu menjadi PNR final. Ambil ulang `pnrCode` dari
`queryOrderDetails.do` setelah `ticketStatus=1`.

## 23. UAT Checklist

```text
[ ] Search status=0
[ ] routingIdentifier captured
[ ] Verify status=0
[ ] sessionId captured
[ ] Order status=0
[ ] Pay status=0
[ ] Query orderStatus=2
[ ] Query ticketStatus=1
[ ] PNR captured after ticketing
[ ] Ancillary orderType=6 where required
[ ] Main order linked for post-ticketing ancillary
```

## 24. Production Transition

Pindah ke production hanya setelah:

1. Sandbox flow stabil.
2. Semua modul wajib UAT lulus.
3. UAT approval diterima.
4. Account diubah ke `LIVE` oleh Atlas.
5. Production credentials dibuat.
6. Search dan transaction base URL diganti.
7. Controlled production smoke test berhasil.

## 25. Complete UAT Matrix

Gunakan status final, bukan status langsung setelah payment.

| Module                    | Route / Flow                        | Expected final state                  | Verified result                                                  |
| ------------------------- | ----------------------------------- | ------------------------------------- | ---------------------------------------------------------------- |
| Flight Booking connection | `AMS -> MAA`                      | `orderStatus=2`, `ticketStatus=1` | Passed in Sandbox                                                |
| Flight Booking round-trip | `DUR -> CPT`, 2A + 1C             | `orderStatus=2`, `ticketStatus=1` | Passed in Sandbox                                                |
| VCC                       | `PUS -> CJU`, `paymentMethod=3` | `orderStatus=2`, `ticketStatus=1` | Passed, then voided                                              |
| In-booking baggage        | `BOM -> IXR`                      | Ticketed with ancillary               | Passed in Sandbox                                                |
| Seat selection            | `COK -> DXB`                      | Ticketed with seat ancillary          | Passed in Sandbox                                                |
| Webhook                   | Ticketed order event                | URL registered and order ticketed     | Registration verified; event receiver must be checked externally |
| Fulfilment                | `getOfferPrice.do` flow           | Ticketed order                        | Passed with flight number`171`                                 |
| Regenerate                | Unpaid order -> new order           | New order paid and ticketed           | API regeneration and payment verified; ticketing must be polled  |
| Post-ticketing baggage    | `ELQ -> HMB`                      | `orderType=6`, ancillary ticketed   | Passed after combined segments and polling                       |
| Refund                    | Ticketed order                      | Refund quotation/execution accepted   | Processing status`0`                                           |
| Void                      | Ticketed order                      | Void quotation/execution accepted     | Processing status`0`                                           |

## 26. Sandbox Behavior Confirmed

### Payment is asynchronous

```text
pay.do status=0
  != ticketStatus=1
```

Atlas dapat memerlukan beberapa query dengan jeda beberapa detik.

### Search and fulfilment use different flight formats

```text
search.do       -> FA171
getOfferPrice.do -> 171
```

Selalu ambil nilai dari response Search dan ikuti format yang diterima endpoint
Fulfilment.

### Ancillary availability is not purchase guarantee

`canPurchasePostTicket: 1` berarti product ditawarkan pada search response,
tetapi maskapai Sandbox masih dapat menolak order dengan status `503` jika:

- Passenger tidak identik dengan ticket.
- Segment tidak lengkap.
- Product tidak sesuai allowance.
- Ada phantom/duplicate ancillary order.

Untuk connecting baggage, kirim product code sama pada seluruh segment yang
ditampilkan oleh ancillary search.

### Sandbox order states

```text
orderStatus=0 or 1 -> created / processing
orderStatus=2       -> completed
ticketStatus=0      -> not issued
ticketStatus=1      -> issued
orderType=1         -> main flight order
orderType=6         -> post-ticketing ancillary order
```

## 27. Final Smoke Test Sequence

```text
1. Load CLIENT_KEY and SECRET_KEY from .env.
2. POST search.do with YYYYMMDD.
3. Require status=0 and routings not empty.
4. Save routingIdentifier.
5. POST verify.do.
6. Require sessionId.
7. POST order.do.
8. Save orderNo and pnrCode.
9. POST pay.do.
10. Poll queryOrderDetails.do.
11. Require orderStatus=2 and ticketStatus=1.
12. Store newest orderNo, PNR, total, and currency.
```

For ancillary:

```text
1. Main ticket must already be ticketed.
2. Search ancillary with latest ticketOrderNo.
3. Copy productCode and segmentIndex from response.
4. Order ancillary.
5. Require orderType=6.
6. Pay ancillary order.
7. Poll until ticketStatus=1.
```
