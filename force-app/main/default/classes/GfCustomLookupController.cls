/**
 * @description       : 
 * @author            : yoseong.kang@dkbmc.com
 * @group             : 
 * @last modified on  : 2024-10-28
 * @last modified by  : yoseong.kang@dkbmc.com
 * Modifications Log
 * Ver   Date         Author                   Modification
 * 1.0   2024-09-03   yoseong.kang@dkbmc.com   Initial Version
**/
public with sharing class GfCustomLookupController {
     
    /**
    * @description objectName의 label을 가져옵니다.
    * @author yoseong.kang@dkbmc.com | 2024-10-28 
    * @param String objectName 
    * @return String 
    **/
    @AuraEnabled
    public static String initComponent(String objectName) {
        String label = '';
        if(objectName != null){
            List<Schema.DescribeSObjectResult> describeSobjectsResult = Schema.describeSObjects(new List<String>{objectName});
            label = describeSobjectsResult[0].getLabel();    
        }
        
        system.debug('label' + label);
        return label;
    }

    @AuraEnabled
    public static List<sObject> queryRecords(
		String searchKeyword,       // Search Text
		String objectName,          // Target Object API Name
        String searchFields,        // Search Target Fields (comma seperated)
        String additionalDisplay,   // Additional display fields (comma seperated)
        String additionalSelect,    // Additional select fields (comma seperated)
        String filterFields,        // Filter Fields (comma seperated)
		String filterValues,        // Filter Values (comma seperated)
        String filterConditions,    // Filter Conditions (comma seperated)
        String filterExpression,    // Complex filter condition (full statement)
		String recordTypeNames,     // Filter by Record Type Name (comma seperated)
        Boolean onlyOwned,          // Query only user owned records
        String groupField,          // 
        String orderBy,             // Order By specific field (comma seperated)
		String numLimit) {          // Number of query records
        
        List<sObject> returnList = new List<sObject> ();  
        
        String sQuery = '';
        sQuery += 'SELECT Id, Name';
        // sQuery += (additionalSelect != null && additionalSelect != '') ? makeQueryString(additionalSelect) : '';
        // sQuery += (additionalDisplay != null && additionalDisplay != '') ? makeQueryString(additionalDisplay) : '';
        sQuery += makeQueryString(objectName, additionalDisplay, additionalSelect, groupField);

        sQuery += ' FROM ';
        sQuery += objectName;

        sQuery += makeSearchString(searchFields, searchKeyword);

        // Add filters
        System.debug(filterFields);
        sQuery += ((filterFields != null && filterFields != '') || filterExpression != '') ? makeFilterString(objectName, filterFields, filterValues, filterConditions, filterExpression) : '';

        // Add RecordType filter
        sQuery += (recordTypeNames != null && recordTypeNames != '') ? makeRecordTypeFilter(recordTypeNames) : '';

        // Query only owned records
        if(onlyOwned){
            String ownerId = UserInfo.getUserId();
            sQuery += ' AND OwnerId = :ownerId ';
        }
        // Set order by string
        sQuery += makeOrderBy(groupField, orderBy);
        // Set number of records to query
        sQuery += ' LIMIT ';
        sQuery += numLimit;

        system.debug(sQuery);
        List<sObject> lstOfRecords = Database.query(sQuery);
        
        for (sObject obj: lstOfRecords) {
            returnList.add(obj);
        }
        return returnList;
    }

    /**
    * @description 방금 만들어진 record를 가져온다.
    * @author yoseong.kang@dkbmc.com | 2024-10-28 
    * @param String objectName 
    * @return sObject 
    **/
    @AuraEnabled
    public static sObject getCreatedRecord(String objectName) {
        DateTime dt = system.now().addSeconds(-5);
        String createdById = UserInfo.getUserId();
        String sQuery = '';
        sQuery += 'SELECT Id, Name FROM ';
        sQuery += objectName;
        sQuery += ' WHERE CreatedById = :createdById ';
        sQuery += ' AND CreatedDate > :dt ';
        sQuery += ' ORDER BY CreatedDate DESC LIMIT 1';
        list<sObject> lobj = Database.query(sQuery);
        if(lobj != null && lobj.size() > 0){
            return lobj[0];
        }
        return null;
    }

    @TestVisible
    private static String makeQueryString(String objectName, String additionalDisplay, String additionalSelect, String groupField){
        String query = '';
        Set<String> fieldStrings = new Set<String>();
        if(String.isNotBlank(additionalDisplay)) {
            fieldStrings.addAll(additionalDisplay.split(','));
        }
        if(String.isNotBlank(additionalSelect)) {
            fieldStrings.addAll(additionalSelect.split(','));
        }
        if(String.isNotBlank(groupField)) {
            fieldStrings.add(groupField);

            // 필드 타입이 Picklist 타입인 경우, toLabel Query 추가후 alias 를 suffix "__l" 로 하여 추가
            DescribeSObjectResult objResult = Schema.getGlobalDescribe().get(objectName).getDescribe();
            DescribeFieldResult fieldResult = objResult.fields.getMap().get(groupField).getDescribe();
            if(fieldResult.getType() == Schema.DisplayType.PICKLIST) {
                fieldStrings.add('toLabel('+groupField+') '+ groupField+'__l');
            }
        }
        if(fieldStrings.size() > 0){
            for(String field : fieldStrings){
                query += ', ' + field;
            }
        }
        return query;
    }

    @TestVisible
    private static String makeQueryString(String s){
        String query = '';
        // list<String> stringList = s.replaceAll(' ', '').split(',');
        list<String> stringList = s.split(',');

        if(stringList.size() > 0){
            for(String field : stringList){
                query += ', ' + field;
            }
        }
        return query;
    }

    @TestVisible
    private static String makeSearchString(String searchFields, String searchKeyword){
        String query = '';
        if(searchFields != null && searchFields != ''){
            list<String> searchList = new list<String>();
            searchList = searchFields.replaceAll(' ', '').split(',');
            if(searchList.size() > 0){
                query += ' WHERE (Name LIKE \'%' + searchKeyword + '%\'';
                for(String field : searchList){
                    query += ' OR ' + field + ' LIKE \'%' + searchKeyword + '%\'';
                }
                query += ')';
            }
        } else {
            query += ' WHERE Name LIKE \'%' + searchKeyword + '%\'';
        }
        return query;
    }

    @TestVisible
    private static String makeFilterString(String objectName, String filterFields, String filterValues, String filterConditions, String filterExpression){
        String query = '';

        if(filterFields != null && filterFields != ''){
            list<String> fields = filterFields.replaceAll(' ', '').split(',');
            list<String> values = filterValues.replaceAll(' ', '').split(',');
            list<String> ops = filterConditions.replaceAll(' ', '').split(',');
            Integer cnt = fields.size();
    
            SObjectType objType = Schema.getGlobalDescribe().get(objectName);
            map<String, Schema.SObjectField> fieldMap = objType.getDescribe().fields.getMap();
    
            for(Integer i = 0; i < cnt; i++){
                Schema.SObjectField field = fieldMap.get(fields[i]);
                Schema.DescribeFieldResult fld = field.getDescribe();
                String fieldType = fld.getType().name();
                Boolean useNative = false;
                //if(values[i] == 'null' || values[i] == 'empty' || values[i] == 'true' || values[i] == 'false' /* || values[i].isNumeric() */ )
                if(values[i] == 'null' || values[i] == 'empty' || values[i] == 'true' || values[i] == 'false' 
                    || fieldType == 'INTEGER' || fieldType == 'CURRENCY' || fieldType == 'DOUBLE' 
                    || fieldType == 'DATE' || fieldType == 'DATETIME' || fieldType == 'BOOLEAN'){
                        useNative = true;
                    }
                if(values[i] == 'empty'){ values[i] = '\'\''; } 
                query += ' AND ' + fields[i] + convertOperator(ops[i]) + (useNative ? values[i] : '\'' + values[i] + '\'');
            }
        }

        if(filterExpression != ''){
            query += ' AND (' + filterExpression + ') ';
        }

        return query;
    }

    @TestVisible
    private static String makeRecordTypeFilter(String recordTypeNames){
        String query = ' AND (';

        list<String> typeList = new list<String>();
        typeList = recordTypeNames.replaceAll(' ', '').split(',');
        if(typeList.size() > 0){
            Integer cnt = 0;
            for(String value : typeList){
                if(cnt > 0) { query += ' OR '; }
                query += ' RecordType.Name = \'' + value + '\' ';
                cnt++;
            }
        }

        query += ') ';

        return query;
    }

    @TestVisible
    private static String makeOrderBy(String groupField, String orderBy){
        if(String.isBlank(groupField) && String.isBlank(orderBy)) {
            return ' ORDER BY Name ASC'; 
        }
        // if(orderBy == null || orderBy == '') { return ' ORDER BY Name ASC'; }

        String query = ' ORDER BY ';
        query += groupField;

        list<String> orderList = new list<String>();
        orderList = orderBy.split(',');
        if(orderList.size() > 0){
            if(!String.isBlank(groupField)) query += ',';

            for(String value : orderList){
                query += ' ' + value + ', ';
            }
        }

        query = query.substring(0, query.length() - 2);
        return query;
    }

    @TestVisible
    private static String convertOperator(String op){
        String operator = '';

        switch on op {
            when 'eq' {
                operator = ' = ';
            }
            when 'ne' {
                operator = ' != ';
            }
            when 'gt' {
                operator = ' > ';
            }
            when 'lt' {
                operator = ' < ';
            }
            when 'gte' {
                operator = ' >= ';
            }
            when 'lte' {
                operator = ' <= ';
            }
            when else {
                throw new CustomLookupException('specified filter confition is invalid!');
            }
        }

        return operator;
    }

    public class CustomLookupException extends Exception {}

}