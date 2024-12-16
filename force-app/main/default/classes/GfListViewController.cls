public with sharing class GfListViewController {
    
    @AuraEnabled
    public static List<WrapperClass> searchProducts(String searchValue) {
        String searchFilter = String.isNotBlank(searchValue) ? '%' + searchValue + '%' : '%';
        List<WrapperClass> recordList = new List<WrapperClass>();

         for(GfAmsGoods__c record : [
            SELECT  Id, Name, GoodsNameEnglish__c, GoodsShortName__c, PurchaseVenderType__c, GoodsType__c, Class__c, 
                    Barcode__c, ParentGoods__c, Maker__c, Origin__c, PurchaseVendor__c, BoxAcquisitionQuantities__c, BoxBarcode__c, 
                    TaxType__c, TaxRate__c, IsActive__c, Unit__c, SalesPrice__c, PurchaseStartDate__c, PurchaseEndDate__c, 
                    PurchaseLower__c, PurchaseUpper__c, PurchaseLimit__c, PurchaseLimitReason__c, PurchaseLimitDateTime__c, 
                    ReturnLimit__c, BasePrice__c, GraceAPrice__c, GraceBPrice__c, GraceCPrice__c, GraceDPrice__c, GraceEPrice__c, 
                    GraceFPrice__c, GraceGPrice__c, GraceHPrice__c, GraceIPrice__c, GraceJPrice__c
            FROM GfAmsGoods__c
            WHERE Name LIKE :searchFilter
            OR Barcode__c LIKE :searchFilter
            LIMIT 5
        ]) {
            recordList.add(new WrapperClass(record));
        }
        return recordList;
    }

    public class WrapperClass {
        @AuraEnabled public String id;
        @AuraEnabled public String productCode;
        @AuraEnabled public String productName;
        @AuraEnabled public Decimal productPrice;
        @AuraEnabled public String color;
        @AuraEnabled public String diameter;
        @AuraEnabled public String material;

        public WrapperClass() {}

        public WrapperClass(GfAmsGoods__c record) {
            this.id           = record.Id;
            this.productName  = record.Name;
            this.productCode  = record.Barcode__c;
            this.productPrice = record.BasePrice__c;
            this.color        = null;
            this.diameter     = null;
            this.material     = null;
        }
    }


}