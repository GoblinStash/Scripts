// Get command line arguments
var argv = require('minimist')(process.argv.slice(2));

// Import the icecold library
var icecold = require('icecold').icecold;
var ic = new icecold(argv.api);

// Run the realmscraper library
var rs = new RealmScraper();
rs.run();

class RealmScraper {
    constructor() {
        this.realms = [];
        this.connected = 0;
    }
    
    /**
     * Runs the entire realm scraping process
     **/
    run() {
        ic.wow.realm.status()
        .then(reply => {
            let realms = [];
            for(var i = 0; i < reply.realms.length; i++) {
                reply.realms[i].id = i+1;
                realms.push(reply.realms[i]);
            }
            realms = this.connectRealms(realms);
            return this.formatRealmSQL(reply.realms);

        })
        .then(reply => {
            return this.saveRealmSQL(reply);
        })
        .then(() => {
            return this.formatConnectedRealmSQL();
        })
        .then(reply => {
            this.saveConnectedRealmSQL(reply);
        })
        // .then(() => {
        //     return this.connectRealms(this.realms);
        // })
        // .then(reply => {
        //     this.formatConnectedRealmSQL(reply);
        // })
    };
    
    /**
     * Iterates in a disgusting manner through realms
     * to connect them in a relational format
     **/
    connectRealms(realms) {
        var connected = 1;
        // Loop through the realms
        for(var i = 0; i < realms.length; i++) {
            if(realms[i].ConnectedRealmID) { continue;}
            // Loop through all connected realms
            for(var j = 0; j < realms[i].connected_realms.length; j++) {
                // Get realm slugs and add the connected Realm ID
                for(var t = 0; t < realms.length; t++) {
                    if(realms[i].connected_realms[j] == realms[t].slug) {
                        realms[t].ConnectedRealmID = connected;
                    }
                }
            }
            connected++;
        }
        this.connected = connected;
        return realms;
    }
    
    getRealmID(realms, realm) {
        for(var i = 0; i < realms.length; i++) {
            if(realms[i].slug == realm) {
                return realms[i].id;
            }
        }
    }
    
    
    
    
    formatRealmSQL(realms) {
        var string = "INSERT INTO Realms (id, name, slug, RegionID, ConnectedRealmID) VALUES \r\n"
        for(var i = 0; i < realms.length; i++) {
            string += `(${i+1}, '${this.escapeQuotes(realms[i].name)}', '${this.escapeQuotes(realms[i].slug)}', 1, ${realms[i].ConnectedRealmID})`
            if(i < realms.length-1) {
                string += ", \r\n";
            } else {
                string += ";";
            }
        }
        // console.log(string);
        return string;
    }
    
    saveRealmSQL(sql) {
        var fs = require('fs-extra');
        return fs.mkdirs(__dirname + '/dump')
        .then(reply => {
            return fs.writeFile(__dirname + '/dump/RealmSeed.sql', sql)
        });
    }
    
    
    
    formatConnectedRealmSQL() {
        var sql = "INSERT INTO ConnectedRealms (id) VALUES \r\n";
        for(var i = 1; i < this.connected+1; i++) {
            sql += `(${i})`;
            if(i < this.connected) {
                sql += ", \r\n";
            } else {
                sql += ";";
            }
        }
        return sql;
    }
    
    saveConnectedRealmSQL(sql) {
        var fs = require('fs-extra');

        return fs.writeFile(__dirname + '/dump/ConnectedRealmSeed.sql', sql)
        .then(reply => {
            return;
        });
        
    }
    
    escapeQuotes(text) {
        return text.replace("'", "''");
    }
}
