import wallet from "../../turbin3-wallet.json"
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults"
import { createGenericFile, createSignerFromKeypair, signerIdentity } from "@metaplex-foundation/umi"
import { irysUploader } from "@metaplex-foundation/umi-uploader-irys"


// Create a devnet connection
const umi = createUmi('https://turbine-solanad-4cde.devnet.rpcpool.com/168dd64f-ce5e-4e19-a836-f6482ad6b396');

let keypair = umi.eddsa.createKeypairFromSecretKey(new Uint8Array(wallet));
const signer = createSignerFromKeypair(umi, keypair);

umi.use(irysUploader({address: "https://devnet.irys.xyz/"}));

umi.use(signerIdentity(signer));

(async () => {
    try {
        // Follow this JSON structure
        // https://docs.metaplex.com/programs/token-metadata/changelog/v1.0#json-structure

        const image = 'https://devnet.irys.xyz/A2Y4npDffh77ZeSfhdfhhLRmUiwkKzSA1tPBP6GUKxev';
        const metadata = {
            name: "RUG By Crypto Dandy",
            symbol: "RUBBCD",
            description: "I'm rugged ",
            image: image,
            attributes: [
                { trait_type: 'Building Type', value: 'Skycraper' },
                { trait_type: 'Color', value: 'Red based' }
            ],
            properties: {
                files: [
                    {
                        type: "image/png",
                        uri: image
                    },
                ]
            },
            creators: []
        };

        const myUri = await umi.uploader.uploadJson(metadata);

        console.log("Your metadata URI: ", myUri);
    }
    catch(error) {
        console.log("Oops.. Something went wrong", error);
    }
})();
